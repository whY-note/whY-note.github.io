import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { getShundeDaylight, createShundeDaylightClock } from "../../life/room-daylight.js";

// Broad local-time windows also guard against a wrong hemisphere or UTC offset.
const seasons = [
  ["2026-06-21", 5.5, 6, 19, 19.5],
  ["2026-12-21", 7, 7.25, 17.5, 18],
  ["2026-11-22", 6.5, 7, 17.5, 18]
];
const localHour = (date) => ((+date / 3600000 + 8) % 24 + 24) % 24;
for (const [day, riseMin, riseMax, setMin, setMax] of seasons) {
  const state = getShundeDaylight(new Date(`${day}T12:00:00+08:00`));
  assert.equal(state.mode, "day");
  assert(localHour(state.sunrise) > riseMin && localHour(state.sunrise) < riseMax);
  assert(localHour(state.sunset) > setMin && localHour(state.sunset) < setMax);
  for (const [time, mode] of [[+state.sunrise - 1, "night"], [+state.sunrise, "day"],
    [+state.sunrise + 1, "day"], [+state.sunset - 1, "day"], [+state.sunset, "night"], [+state.sunset + 1, "night"]]) {
    const actual = getShundeDaylight(new Date(time));
    assert.equal(actual.mode, mode);
    assert(+actual.nextChangeAt > time);
  }
  const morning = getShundeDaylight(new Date(`${day}T00:00:00+08:00`));
  const evening = getShundeDaylight(new Date(`${day}T23:59:59+08:00`));
  assert.equal(+morning.sunrise, +state.sunrise);
  assert.equal(+evening.sunset, +state.sunset);
  assert.equal(+morning.nextChangeAt, +state.sunrise);
  assert(+evening.nextChangeAt > +state.sunset);
}
assert.throws(() => getShundeDaylight(new Date(NaN)), RangeError);

// A visitor's timezone, including a different calendar day, must have no effect.
const sample = ["2026-11-21T16:00:00Z", "2026-11-21T22:50:00Z", "2026-11-22T09:45:00Z", "2026-12-31T16:00:00Z"];
const expected = sample.map((value) => getShundeDaylight(new Date(value)));
for (const tz of ["UTC", "America/Los_Angeles", "Pacific/Kiritimati", "Asia/Shanghai"]) {
  const child = spawnSync(process.execPath, ["--import", new URL("./three-loader.mjs", import.meta.url).href,
    "--input-type=module", "-e", `import {getShundeDaylight} from ${JSON.stringify(new URL("../../life/room-daylight.js", import.meta.url).href)};
console.log(JSON.stringify(${JSON.stringify(sample)}.map(value=>getShundeDaylight(new Date(value)))));`],
  { env: { ...process.env, TZ: tz }, encoding: "utf8" });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), JSON.parse(JSON.stringify(expected)));
}

// Advance a fake wall clock through events without real sleeps.
const { sunset } = getShundeDaylight(new Date("2026-11-22T12:00:00+08:00"));
let time = +sunset - 1000;
let nextId = 0;
const pending = new Map();
const changes = [];
const clock = createShundeDaylightClock((state, options) => changes.push({ ...state, ...options }), {
  now: () => new Date(time),
  setTimer(callback, delay) { const id = ++nextId; pending.set(id, { callback, delay }); return id; },
  clearTimer(id) { pending.delete(id); }
});
const next = () => { assert.equal(pending.size, 1); return [...pending.values()][0]; };
assert.equal(changes.at(-1).mode, "day");
assert(changes.at(-1).immediate);
assert.equal(next().delay, 1000);
time = +sunset;
next().callback();
assert.equal(changes.at(-1).mode, "night");
assert.equal(next().delay, 60000);
// Returning from a hidden tab or BFCache must update immediately, even days later.
clock.pause();
assert.equal(pending.size, 0);
time = +new Date("2026-11-24T12:00:00+08:00");
clock.refresh(true);
assert.equal(changes.at(-1).mode, "day");
assert(changes.at(-1).immediate);
assert.equal(pending.size, 1);
clock.refresh();
assert.equal(pending.size, 1, "Refresh replaces the previous timer");
// A wall-clock correction is picked up by the minute heartbeat.
time = +new Date("2026-11-24T22:00:00+08:00");
next().callback();
assert.equal(changes.at(-1).mode, "night");
clock.dispose();
assert.equal(pending.size, 0);
const count = changes.length;
clock.refresh(true);
assert.equal(changes.length, count);
console.log(JSON.stringify({ status: "PASS", seasons: seasons.length, boundaryChecks: 18, visitorTimezones: 4,
  clock: "boundary scheduling, minute calibration, pause/resume, clock changes and disposal" }, null, 2));

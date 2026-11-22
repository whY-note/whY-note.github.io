import SunCalc from "./vendor/suncalc/suncalc.js";

export const SHUNDE = Object.freeze({ latitude: 22.80, longitude: 113.29, timeZone: "Asia/Shanghai" });
const DAY = 86400000;
const UTC_OFFSET = 8 * 3600000;

// Use Shunde's calendar day, never the visitor's local date. Local noon also
// keeps SunCalc 1.9 on the intended solar day around midnight.
export function getShundeDaylight(now = new Date()) {
  const time = +now;
  if (!Number.isFinite(time)) throw new RangeError("A valid current time is required");
  const localDay = Math.floor((time + UTC_OFFSET) / DAY);
  const noon = localDay * DAY - UTC_OFFSET + DAY / 2;
  const times = SunCalc.getTimes(new Date(noon), SHUNDE.latitude, SHUNDE.longitude);
  const { sunrise, sunset } = times;
  const isDay = time >= +sunrise && time < +sunset;
  const nextChangeAt = time < +sunrise ? sunrise : time < +sunset ? sunset
    : SunCalc.getTimes(new Date(noon + DAY), SHUNDE.latitude, SHUNDE.longitude).sunrise;
  return { mode: isDay ? "day" : "night", sunrise, sunset, nextChangeAt };
}

// A preview URL can temporarily select a scene; normal URLs follow Shunde time.
export function getRoomDaylight(now = new Date()) {
  const state = getShundeDaylight(now);
  const preview = new URLSearchParams(globalThis.location?.search || "").get("scene");
  return preview === "day" || preview === "night" ? { ...state, mode: preview } : state;
}

// Boundary timer plus a minute heartbeat: catch clock changes and refresh the
// day's events without keeping the scene rendering. Injectable time aids checks.
export function createShundeDaylightClock(onChange, {
  now = () => new Date(), setTimer = setTimeout, clearTimer = clearTimeout
} = {}) {
  let timer;
  let disposed = false;
  function pause() { clearTimer(timer); timer = undefined; }
  function refresh(immediate = false) {
    if (disposed) return;
    pause();
    const current = now();
    const state = getRoomDaylight(current);
    onChange(state, { immediate });
    if (!disposed) timer = setTimer(() => refresh(), Math.max(1, Math.min(60000, +state.nextChangeAt - +current)));
    return state;
  }
  refresh(true);
  return { refresh, pause, dispose() { disposed = true; pause(); } };
}

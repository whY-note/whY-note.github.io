import * as THREE from "three";

const color = (value) => new THREE.Color(value);
const lerp = THREE.MathUtils.lerp;

export function createRoomLighting({ scene, model, renderer, hemisphere, ambient, sunlight, fill }) {
  const find = (name) => model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  const sky = find("WindowSky_NoShadow");
  const sun = find("Sun_NoShadow");
  const bulb = find("Lamp warm bulb NoShadow");
  const journal = find("Journal");
  if (!sky || !sun || !bulb || !journal) throw new Error("Missing window or desk lamp lighting objects");

  // Materials outside this small set keep their authored daytime appearance.
  const materialChanges = [];
  const reflectorMaterials = [];
  const seen = new Set();
  model.traverse((object) => {
    if (!object.isMesh) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (seen.has(material)) continue;
      seen.add(material);
      if (material.name === "Lamp ivory reflector") reflectorMaterials.push(material);
      const nightColors = { Sky: 0x142b49, Leaves: 0x273b40, "Young leaves": 0x354b4d };
      if (!(material.name in nightColors)) continue;
      materialChanges.push({ material, dayColor: material.color.clone(), nightColor: color(nightColors[material.name]),
        dayEmissive: material.emissive.clone(), dayIntensity: material.emissiveIntensity });
    }
  });
  const sunMaterials = (Array.isArray(sun.material) ? sun.material : [sun.material]);
  for (const material of sunMaterials) { material.transparent = true; material.depthWrite = false; }

  const nightWindow = new THREE.Group();
  nightWindow.name = "NightWindow_NoShadow";
  const skyBounds = new THREE.Box3().setFromObject(sky);
  const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xffedc6, transparent: true, toneMapped: false });
  const moon = new THREE.Mesh(new THREE.CircleGeometry(.17, 48), moonMaterial);
  moon.name = "Moon_NoShadow";
  sun.getWorldPosition(moon.position);
  moon.position.x += .15;
  nightWindow.add(moon);
  const starMaterial = new THREE.MeshBasicMaterial({ color: 0xd9e4fa, transparent: true, toneMapped: false });
  const starGeometry = new THREE.CircleGeometry(.012, 6);
  // Fixed positions avoid flicker/random layout changes and fit inside the sky.
  const positions = [[.13,.69],[.26,.9],[.42,.80],[.53,.93],[.67,.84],[.81,.91],
    [.91,.70],[.73,.64],[.49,.60],[.32,.55],[.15,.40],[.61,.39]];
  for (const [i, [x, y]] of positions.entries()) {
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.name = `Star_${i}_NoShadow`;
    star.position.set(lerp(skyBounds.min.x, skyBounds.max.x, x), lerp(skyBounds.min.y, skyBounds.max.y, y), moon.position.z - .005);
    star.scale.setScalar(i % 3 === 0 ? 1.35 : .8);
    nightWindow.add(star);
  }
  scene.add(nightWindow);

  const lamp = new THREE.SpotLight(0xffcf79, 0, 3.5, Math.PI / 4.5, .65, 2);
  lamp.name = "DeskLampWarmLight";
  bulb.getWorldPosition(lamp.position);
  const target = new THREE.Box3().setFromObject(journal).getCenter(new THREE.Vector3());
  lamp.target.position.copy(target);
  // Move towards the open mouth so the metal shade does not block its own beam.
  lamp.position.addScaledVector(target.clone().sub(lamp.position).normalize(), .12);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.camera.near = .025;
  lamp.shadow.camera.far = 3.5;
  lamp.shadow.bias = -.0001;
  lamp.shadow.normalBias = .008;
  scene.add(lamp, lamp.target);
  const bulbMaterials = Array.isArray(bulb.material) ? bulb.material : [bulb.material];

  const daySky = hemisphere.color.clone(), dayGround = hemisphere.groundColor.clone();
  const nightSky = color(0xd3c3ab), nightGround = color(0x746959);
  const dayAmbient = ambient.color.clone(), dayFill = fill.color.clone();
  const nightAmbient = color(0xffe9cd), nightFill = color(0xffe7c6);
  const dayBackground = color(0xc9c0ad), nightBackground = color(0x252d40);
  const warmBulb = color(0xffc56b), nightSkyEmission = color(0x183557);
  const warmReflector = color(0xffb52e);
  let amount = 0;
  let targetAmount = null;
  let transition = null;

  function apply(value) {
    amount = value;
    hemisphere.color.copy(daySky).lerp(nightSky, value);
    hemisphere.groundColor.copy(dayGround).lerp(nightGround, value);
    // Reuse the existing room lighting to approximate warm bounced light,
    // keeping the whole interior readable without adding another fixture.
    hemisphere.intensity = lerp(1.8, .90, value);
    ambient.color.copy(dayAmbient).lerp(nightAmbient, value);
    ambient.intensity = lerp(1, .65, value);
    sunlight.intensity = 2.8 * (1 - value);
    fill.color.copy(dayFill).lerp(nightFill, value);
    fill.intensity = lerp(1.05, .50, value);
    renderer.setClearColor(dayBackground.clone().lerp(nightBackground, value));
    for (const { material, dayColor, nightColor, dayEmissive, dayIntensity } of materialChanges) {
      material.color.copy(dayColor).lerp(nightColor, value);
      if (material.name === "Sky") {
        material.emissive.copy(dayEmissive).lerp(nightSkyEmission, value);
        material.emissiveIntensity = lerp(dayIntensity, .65, value);
      }
    }
    sun.visible = value < 1;
    for (const material of sunMaterials) material.opacity = 1 - value;
    nightWindow.visible = value > 0;
    moonMaterial.opacity = starMaterial.opacity = value;
    lamp.intensity = 6.5 * value;
    for (const material of bulbMaterials) {
      material.emissive.copy(warmBulb);
      material.emissiveIntensity = 3 * value;
    }
    // Approximate bulb light bouncing inside the shade. The outward spotlight
    // lights the desk, but cannot illuminate the reflector behind its beam.
    for (const material of reflectorMaterials) {
      material.emissive.copy(warmReflector);
      material.emissiveIntensity = .60 * value;
    }
    renderer.shadowMap.needsUpdate = true;
  }

  function setMode(mode, { immediate = false } = {}) {
    const next = mode === "night" ? 1 : 0;
    if (next === targetAmount && !immediate) return false;
    targetAmount = next;
    if (immediate || amount === next) { transition = null; apply(next); }
    else transition = { from: amount, start: performance.now() };
    return true;
  }
  function update(now, reducedMotion = false) {
    if (!transition) return false;
    const progress = reducedMotion ? 1 : Math.min(1, Math.max(0, (now - transition.start) / 2000));
    const eased = progress * progress * (3 - 2 * progress);
    apply(lerp(transition.from, targetAmount, eased));
    if (progress === 1) transition = null;
    return !!transition;
  }
  return { setMode, update, dispose() { lamp.shadow.dispose(); } };
}

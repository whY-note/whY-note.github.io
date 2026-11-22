import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import vm from "node:vm";
import * as THREE from "three";
import { GLTFLoader } from "../../life/vendor/three/addons/loaders/GLTFLoader.js";
import { DEFAULT_VIEW, getRoomFrame, configureRoomCamera, applyPanoramaCrop } from "../../life/room-view.js";
import { createScaleFeedback, updateScaleFeedback, createLidFeedback, updateLidFeedback } from "../../life/room-feedback.js";
import { createRoomLighting } from "../../life/room-lighting.js";
import { refineWindowScenery } from "../../life/room-scenery.js";

const file = new URL("../../life/models/room.glb", import.meta.url);
const bytes = await readFile(file);
assert.equal(bytes.toString("ascii", 0, 4), "glTF", "A real binary glTF asset is required");
assert.equal(bytes.readUInt32LE(4), 2);
assert.equal(bytes.readUInt32LE(8), bytes.length);
assert(bytes.length < 5 * 1024 * 1024, "Keep the web model within its 5 MB budget");
const jsonLength = bytes.readUInt32LE(12);
assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
const binOffset = 20 + jsonLength;
assert.equal(bytes.readUInt32LE(binOffset + 4), 0x004e4942);
const binary = bytes.subarray(binOffset + 8, binOffset + 8 + bytes.readUInt32LE(binOffset));
assert(gltf.buffers[0].byteLength <= binary.length);
assert(!gltf.buffers[0].uri, "The published GLB must contain its own buffers");
for (const image of gltf.images || []) {
  assert.equal(typeof image.bufferView, "number", "Textures must be packed inside the GLB");
  assert(!image.uri);
}
const acrylic = gltf.materials.find((material) => material.name === "Turntable smoked acrylic");
assert.equal(acrylic?.alphaMode, "BLEND", "The open dust cover must remain transparent on the web");
assert(acrylic.doubleSided && acrylic.pbrMetallicRoughness.baseColorFactor[3] > 0 && acrylic.pbrMetallicRoughness.baseColorFactor[3] < .4);
assert(gltf.materials.find((material) => material.name === "Turntable walnut veneer")?.pbrMetallicRoughness.baseColorTexture, "Wood grain must be embedded in the exported material");
const fabricIndex = gltf.materials.findIndex((material) => material.name === "Curtain linen");
assert(fabricIndex >= 0, "Curtains need their own fabric material");
const fabric = gltf.materials[fabricIndex];
assert(fabric.occlusionTexture, "Fold occlusion must be packed into the real-time material");
assert(fabric.pbrMetallicRoughness.roughnessFactor > .9);
assert(!fabric.extensions?.KHR_materials_unlit, "Fabric must keep responding to real-time light");
const curtainNodes = gltf.nodes.filter((node) => node.name?.startsWith("Tied linen curtain"));
assert.equal(curtainNodes.length, 2);
for (const node of curtainNodes) for (const primitive of gltf.meshes[node.mesh].primitives) {
  assert.equal(primitive.material, fabricIndex);
  assert.notEqual(primitive.attributes.TEXCOORD_0, undefined, "Baked fold shadows require UVs");
  assert(gltf.accessors[primitive.attributes.POSITION].count > 3000, "Smooth folds require a sufficiently detailed mesh");
}
for (const view of gltf.bufferViews) {
  assert((view.byteOffset || 0) + view.byteLength <= binary.length, "Buffer view exceeds binary chunk");
}
const named = ["Journal", "Notes", "TravelAlbum", "WorldMap", "RecordPlayer"];
for (const name of named) assert.equal(gltf.nodes.filter((node) => node.name === name).length, 1, `Unique parent: ${name}`);
assert.equal(gltf.cameras?.length || 0, 0, "Camera is controlled by the web page");
assert((await stat(new URL("../../life/models/room.blend", import.meta.url))).size > 10000);
const poster = await readFile(new URL("../../life/models/room-preview.webp", import.meta.url));
assert.equal(poster.toString("ascii", 0, 4), "RIFF");
assert.equal(poster.toString("ascii", 8, 12), "WEBP");

// Node has no image decoder. Strip only material textures from a copy in memory;
// load all real exported geometry, transforms and hierarchy with GLTFLoader.
for (const material of gltf.materials || []) {
  delete material.pbrMetallicRoughness?.baseColorTexture;
  delete material.pbrMetallicRoughness?.metallicRoughnessTexture;
  delete material.normalTexture;
  delete material.occlusionTexture;
  delete material.emissiveTexture;
}
delete gltf.images;
delete gltf.textures;
gltf.buffers[0].uri = `data:application/octet-stream;base64,${binary.toString("base64")}`;
globalThis.self = globalThis;
globalThis.ProgressEvent = class { constructor(type, data) { this.type = type; Object.assign(this, data); } };
const { scene } = await new GLTFLoader().parseAsync(JSON.stringify(gltf), "");
refineWindowScenery(scene);
scene.updateMatrixWorld(true);

const lid = scene.getObjectByName("TurntableDustCover");
assert(lid && Math.abs(lid.userData.openAngle + 70*Math.PI/180) < 1e-6);
assert(lid.quaternion.angleTo(new THREE.Quaternion()) < 1e-6, "The model and poster must start with the cover closed");
const hingePosition = lid.position.clone();
const lidFeedback = createLidFeedback(lid);
assert(!updateLidFeedback(lidFeedback, 16), "Hover alone must not open the lid");
lidFeedback.isOpen = true;
updateLidFeedback(lidFeedback, 16);
assert(lidFeedback.progress > 0 && lidFeedback.progress < 1, "Opening must animate from the hinge");
for (let i = 0; i < 80; i++) updateLidFeedback(lidFeedback, 16);
assert(lid.quaternion.angleTo(lidFeedback.open) < 1e-6, "Clicking reaches the original raised angle");
assert(!updateLidFeedback(lidFeedback, 16), "The opened lid stops requesting frames");
lidFeedback.isOpen = false;
updateLidFeedback(lidFeedback, 16);
lidFeedback.isOpen = true;
updateLidFeedback(lidFeedback, 16);
lidFeedback.isOpen = false;
for (let i = 0; i < 80; i++) updateLidFeedback(lidFeedback, 16);
assert(lid.quaternion.angleTo(lidFeedback.closed) < 1e-6, "Repeated clicks can reverse and close the lid");
assert(lid.position.distanceTo(hingePosition) < 1e-9, "The hinge must not move");
lidFeedback.isOpen = true;
updateLidFeedback(lidFeedback, 16, true);
assert.equal(lidFeedback.progress, 1);
lidFeedback.isOpen = false;
updateLidFeedback(lidFeedback, 16, true);
scene.updateMatrixWorld(true);
const meshes = [];
let triangles = 0;
scene.traverse((object) => {
  if (!object.isMesh) return;
  meshes.push(object);
  const positions = object.geometry.attributes.position;
  for (const value of positions.array) assert(Number.isFinite(value));
  triangles += (object.geometry.index?.count || positions.count) / 3;
});
assert(meshes.length > 50, "The room must have actual furniture geometry");
assert(triangles < 100000, "Keep this small room suitable for mobile rendering");
const bounds = new THREE.Box3().setFromObject(scene);
const size = bounds.getSize(new THREE.Vector3());
const view = scene.getObjectByName("RoomShell").userData.view;
assert.deepEqual(view, DEFAULT_VIEW, "Blender preview and web camera share the same framing settings");
assert(size.x > 7.4 && size.x < 8 && size.y > 3.8 && size.z > 12, "A full interior extends around and behind the camera");
function boxOf(name) {
  const object = scene.getObjectByName(name) || scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  assert(object, `Missing room object: ${name}`);
  return new THREE.Box3().setFromObject(object);
}
function centreOf(name) { return boxOf(name).getCenter(new THREE.Vector3()); }
for (const name of named) {
  const s = boxOf(name).getSize(new THREE.Vector3());
  assert(s.x > .01 && s.y > .01 && s.z > .01, `${name} must have physical thickness`);
}
// User sketch: left window/desk, central photo/turntable, right map/cabinet/scroll.
assert(centreOf("Window").x < centreOf("PhotoFrame").x);
assert(centreOf("PhotoFrame").x < centreOf("WorldMap").x);
assert(centreOf("WorldMap").x < centreOf("Calligraphy").x);
assert(centreOf("DeskLamp").x < centreOf("Journal").x && centreOf("Journal").x < centreOf("TeaCup").x);
assert(boxOf("WritingDesk").max.y < boxOf("Window").min.y);
assert(centreOf("Stool").z > boxOf("WritingDesk").max.z);
assert(centreOf("Stool").x > boxOf("WritingDesk").min.x && centreOf("Stool").x < boxOf("WritingDesk").max.x);
assert(boxOf("WorldMap").min.y > boxOf("MemoryCabinet").max.y);
assert(centreOf("Notes").y > centreOf("TravelAlbum").y);
assert(Math.abs(boxOf("RecordTable").max.x - boxOf("MemoryCabinet").min.x) < .001, "Cabinets meet at the shared upright without overlap");
assert(boxOf("RecordTable").max.y < boxOf("MemoryCabinet").max.y);
assert(Math.abs(boxOf("RecordPlayer").min.y - boxOf("RecordTable").max.y) < .03, "Turntable rests on the low cabinet");
assert(Math.abs(centreOf("PhotoFrame").z - centreOf("WorldMap").z) < .15);
assert(Math.abs(centreOf("Calligraphy").z - centreOf("WorldMap").z) < .15);
assert(!scene.getObjectByName("Rug") && !scene.getObjectByName("FloorPlant") && !scene.getObjectByName("CabinetPlant"));

// Real geometry checks for wall clearance, separate legs, and inset shelf joints.
const epsilon = .001;
const partBoxes = (parent, prefix) => scene.getObjectByName(parent).children
  .filter((object) => object.name.startsWith(THREE.PropertyBinding.sanitizeNodeName(prefix)))
  .map((object) => new THREE.Box3().setFromObject(object));
const desktop = boxOf("Desk top");
const wallGap = desktop.min.z - boxOf("Back wall below window").max.z;
assert(wallGap > .005 && wallGap < .035, "The desk must sit against the back wall with a small installation gap");
assert(boxOf("RecordTable").min.x - boxOf("WritingDesk").max.x > .03, "Desk and record console stay visibly separate");
const deskLegs = partBoxes("WritingDesk", "Desk leg");
const consoleFeet = partBoxes("RecordTable", "Record console foot");
const consoleSides = partBoxes("RecordTable", "Record console side");
assert.equal(deskLegs.length, 4);
assert.equal(consoleFeet.length, 4);
assert.equal(consoleSides.length, 1, "The L-joint uses the tall cabinet's upright instead of a duplicate panel");
for (const leg of deskLegs) for (const part of [...consoleFeet, ...consoleSides]) {
  assert(!leg.intersectsBox(part), "Desk legs cannot intersect the console's sides or feet");
}
const nearestLegGap = Math.min(...consoleFeet.map((foot) => foot.min.x)) - Math.max(...deskLegs.map((leg) => leg.max.x));
assert(nearestLegGap > .15, "Desk and console legs need a clear gap, not just non-intersection");
const highSides = partBoxes("MemoryCabinet", "Cabinet side").sort((a,b) => a.min.x-b.min.x);
const highShelves = partBoxes("MemoryCabinet", "Cabinet shelf").sort((a,b) => a.min.y-b.min.y);
const lowShelves = partBoxes("RecordTable", "Record console shelf").sort((a,b) => a.min.y-b.min.y);
for (const shelf of highShelves) {
  assert(Math.abs(shelf.min.x-highSides[0].max.x) < epsilon && Math.abs(shelf.max.x-highSides[1].min.x) < epsilon, "Shelf ends fit between the uprights");
  for (const side of highSides) {
    assert(Math.abs(shelf.max.z-side.max.z) < epsilon && Math.abs(shelf.min.z-side.min.z) < epsilon, "Shelf front and back edges are flush with the sides");
  }
}
assert(Math.abs(highShelves[0].min.y-highSides[0].min.y) < epsilon);
assert(Math.abs(highShelves.at(-1).max.y-highSides[0].max.y) < epsilon);
for (const shelf of lowShelves) {
  assert(Math.abs(shelf.min.x-consoleSides[0].max.x) < epsilon && Math.abs(shelf.max.x-highSides[0].min.x) < epsilon);
  assert(Math.abs(shelf.max.z-consoleSides[0].max.z) < epsilon && Math.abs(shelf.max.z-highSides[0].max.z) < epsilon, "Both cabinet fronts share the same plane");
}
assert(Math.abs(boxOf("Notes").min.y-highShelves[2].max.y) < .01);
assert(Math.abs(boxOf("TravelAlbum").min.y-highShelves[1].max.y) < .01);

// Exercise feedback on the actual rotated journal, wall map and shelf objects.
for (const name of named) {
  const object = scene.getObjectByName(name);
  const before = boxOf(name);
  const position = object.position.clone(), scale = object.scale.clone();
  const state = createScaleFeedback(object, name === "WorldMap");
  for (let i = 0; i < 60; i++) updateScaleFeedback(state, 1.045, 16);
  assert.equal(state.factor, 1.045);
  scene.updateMatrixWorld(true);
  const after = boxOf(name);
  const expected = before.getSize(new THREE.Vector3()).multiplyScalar(1.045);
  assert(after.getSize(new THREE.Vector3()).distanceTo(expected) < 1e-6);
  const axis = name === "WorldMap" ? "z" : "y";
  assert(Math.abs(before.min[axis]-after.min[axis]) < 1e-6, "Feedback must preserve contact with the support");
  updateScaleFeedback(state, 1.065, 16, true);
  assert.equal(state.factor, 1.065, "Reduced motion applies feedback without animation");
  for (let i = 0; i < 60; i++) updateScaleFeedback(state, 1, 16);
  assert(object.position.distanceTo(position) < 1e-9 && object.scale.distanceTo(scale) < 1e-9, "Leaving restores the exact initial pose");
  assert(!updateScaleFeedback(state, 1, 16), "Settled feedback must stop requesting frames");
}
scene.updateMatrixWorld(true);

const camera = new THREE.PerspectiveCamera(view.fov, 1, .1, 60);
const ray = new THREE.Raycaster();
function parentName(object) {
  while (object && object !== scene) {
    if (named.includes(object.name)) return object.name;
    object = object.parent;
  }
  return null;
}
const furniture = ["Window", "WritingDesk", "Stool", "DeskLamp", "TeaCup", "PhotoFrame", "WorldMap", "Calligraphy", "MemoryCabinet", "RecordTable", ...named];
const sizes = [[1440,900], [1920,1080], [1366,768], [2560,1080], [390,844], [320,568], [768,1024], [844,390]];
let framingScenarios = 0;
let clickableScenarios = 0;
for (const [width,height] of sizes) {
  const frame = getRoomFrame(width,height,view);
  // All furniture must fit the complete panorama; portrait intentionally crops it.
  const full = getRoomFrame(frame.fullWidth,height,view);
  configureRoomCamera(camera,full);
  for (const yaw of [-6,0,6]) for (const pitch of [-3,0,3]) {
    camera.position.set(0,view.eyeHeight,view.wallZ).add(new THREE.Vector3().setFromSpherical(
      new THREE.Spherical(full.distance, (90+pitch)*Math.PI/180, yaw*Math.PI/180)));
    camera.lookAt(0,view.eyeHeight,view.wallZ);
    camera.updateMatrixWorld();
    for (const name of furniture) {
      const box = boxOf(name);
      for (const x of [box.min.x,box.max.x]) for (const y of [box.min.y,box.max.y]) for (const z of [box.min.z,box.max.z]) {
        const clip = new THREE.Vector3(x,y,z).project(camera);
        assert(Math.abs(clip.x)<=1 && Math.abs(clip.y)<=1 && Math.abs(clip.z)<=1,
          `${name} clipped at ${width}x${height}, yaw ${yaw}, pitch ${pitch}`);
      }
    }
    framingScenarios++;
  }
  for (const name of named) {
    configureRoomCamera(camera,full);
    const centre = centreOf(name);
    const projected = centre.clone().project(camera);
    const offset = (projected.x*.5+.5)*frame.fullWidth-width/2;
    configureRoomCamera(camera,frame,offset);
    const onScreen = centre.clone().project(camera);
    assert(Math.abs(onScreen.x)<=1 && Math.abs(onScreen.y)<=1, `${name} must be accessible by panning`);
    ray.setFromCamera(new THREE.Vector2(onScreen.x,onScreen.y),camera);
    const hit = ray.intersectObjects(meshes,false)[0];
    assert.equal(hit && parentName(hit.object),name, `${name} must be clickable at ${width}x${height} (hit ${hit?.object.name})`);
    clickableScenarios++;
  }
  configureRoomCamera(camera,frame);
  assert.equal(applyPanoramaCrop(camera,frame,-10000),0);
  assert.equal(applyPanoramaCrop(camera,frame,100000),frame.panMax);
  if (frame.panoramic) {
    assert(frame.fullWidth>=1.5*frame.height && frame.panMax>0);
    assert(camera.view.enabled);
  } else assert(!camera.view?.enabled);
  configureRoomCamera(camera,frame);
  assert.equal(camera.zoom,1);
  if (frame.panoramic) assert.equal(camera.view.offsetX,0, "Reset returns portrait to the left side");
}
configureRoomCamera(camera,getRoomFrame(1500,1000,view));
const centre = centreOf("Journal");
const obstruction = new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.5),new THREE.MeshBasicMaterial());
obstruction.position.copy(camera.position).lerp(centre,.8);
obstruction.updateMatrixWorld();
ray.set(camera.position,centre.clone().sub(camera.position).normalize());
assert.equal(ray.intersectObjects([...meshes,obstruction],false)[0].object,obstruction);
obstruction.geometry.dispose(); obstruction.material.dispose();

// Check the actual exported lamp/window, including real desk illumination and
// daytime restoration. Rendering is validated separately in a browser.
const lightingScene = new THREE.Scene();
lightingScene.add(scene);
const hemisphere = new THREE.HemisphereLight(0xfff1d9, 0x7b7565, 1.8);
const ambient = new THREE.AmbientLight(0xffffff, 1);
const sunlight = new THREE.DirectionalLight(0xffe0b3, 2.8);
const fill = new THREE.DirectionalLight(0xe8eeff, 1.05);
const fakeRenderer = { shadowMap: {}, setClearColor(value) { this.background = value.clone(); } };
const sky = scene.getObjectByName("WindowSky_NoShadow");
const daySky = sky.material.color.clone();
const lighting = createRoomLighting({ scene: lightingScene, model: scene, renderer: fakeRenderer, hemisphere, ambient, sunlight, fill });
const lamp = lightingScene.getObjectByName("DeskLampWarmLight");
const nightWindow = lightingScene.getObjectByName("NightWindow_NoShadow");
const bulb = scene.getObjectByName("Lamp_warm_bulb_NoShadow");
const shade = scene.getObjectByName("Lamp_hollow_metal_shade");
const shadeMaterials = [];
shade.traverse((object) => {
  if (object.isMesh) shadeMaterials.push(...(Array.isArray(object.material) ? object.material : [object.material]));
});
const reflector = shadeMaterials.find((material) => material.name === "Lamp ivory reflector");
const shadeExterior = shadeMaterials.find((material) => material.name === "Lamp satin black metal");
assert(reflector && shadeExterior, "The shade needs separate interior and exterior materials");
lighting.setMode("day", { immediate: true });
assert.equal(lamp.intensity, 0);
assert.equal(bulb.material.emissiveIntensity, 0);
assert.equal(reflector.emissiveIntensity, 0, "The shade interior does not glow during the day");
assert(!nightWindow.visible);
assert(sky.material.color.equals(daySky));
lighting.setMode("night", { immediate: true });
assert.equal(lamp.intensity, 6.5);
assert(lamp.castShadow && bulb.material.emissiveIntensity > 0);
assert(reflector.emissiveIntensity > 0 && reflector.emissive.r > reflector.emissive.g
  && reflector.emissive.g > reflector.emissive.b, "The lit shade interior must glow warm yellow");
assert.equal(shadeExterior.emissive.getHex(), 0, "The black metal exterior must not glow");
assert.equal(sunlight.intensity, 0);
assert(nightWindow.visible && !scene.getObjectByName("Sun_NoShadow").visible);
assert(ambient.intensity > .3 && ambient.intensity < 1, "Nighttime room light keeps furniture readable while remaining dimmer than daytime");
const skyBounds = new THREE.Box3().setFromObject(sky);
for (const object of nightWindow.children) {
  object.updateWorldMatrix(true, false);
  const box = new THREE.Box3().setFromObject(object);
  assert(box.min.x >= skyBounds.min.x && box.max.x <= skyBounds.max.x);
  assert(box.min.y >= skyBounds.min.y && box.max.y <= skyBounds.max.y);
}
ray.set(lamp.position, lamp.target.position.clone().sub(lamp.position).normalize());
const beamHit = ray.intersectObjects(meshes.filter((mesh) => !mesh.name.includes("NoShadow")), false)[0];
assert(beamHit && parentName(beamHit.object) === "Journal", `Lamp beam must reach journal, hit ${beamHit?.object.name}`);
lighting.setMode("day");
const start = performance.now();
assert(lighting.update(start + 1000));
assert(lamp.intensity > 0 && lamp.intensity < 6.5);
assert(reflector.emissiveIntensity > 0 && reflector.emissiveIntensity < .85, "The shade follows the light transition");
assert(!lighting.update(start + 2100));
assert.equal(lamp.intensity, 0);
assert.equal(reflector.emissiveIntensity, 0, "Returning to daytime turns off the shade glow");
assert(sky.material.color.equals(daySky));
assert.equal(hemisphere.intensity, 1.8);
assert.equal(sunlight.intensity, 2.8);
assert.equal(fill.intensity, 1.05);
assert(!lighting.setMode("day"), "Unchanged phase must not request more frames");
lighting.setMode("night");
assert(!lighting.update(performance.now(), true));
assert.equal(lamp.intensity, 6.5, "Reduced motion finishes the transition immediately");
lighting.dispose();

// Exercise the browser-independent shell: real hrefs must survive a GPU/module
// failure and unfinished collections must not navigate or pretend to play audio.
const shellSource = await readFile(new URL("../../life/script.js", import.meta.url), "utf8");
function shell(importMaps) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        hidden: false, textContent: "", handlers: {}, attrs: {},
        classList: { add: (v) => classes.add(v), remove: (v) => classes.delete(v), contains: (v) => classes.has(v) },
        setAttribute(key, value) { this.attrs[key] = value; },
        addEventListener(type, handler) { this.handlers[type] = handler; },
        querySelector(selector) { return element(`${id}:${selector}`); },
        contains(target) { return target === this; },
        focus() { this.focused = true; }
      });
    }
    return elements.get(id);
  }
  const links = ["reflection", "notes", "travelAlbum", "worldMap", "music"].map((key) => {
    const link = element(key);
    link.dataset = { roomLink: key };
    return link;
  });
  const navigation = [];
  const events = {};
  const context = vm.createContext({
    HTMLScriptElement: { supports: () => importMaps },
    document: { getElementById: element, querySelector: element, querySelectorAll: () => links, addEventListener(type, handler) { events[type] = handler; } },
    window: { location: { assign: (href) => navigation.push(href) } },
    console: { error() {}, warn() {} }, setTimeout: () => 1, clearTimeout() {}
  });
  new vm.Script(shellSource, { importModuleDynamically: () => Promise.reject(new Error("Offline module")) }).runInContext(context);
  return { element, links, navigation, events };
}
const unsupported = shell(false);
assert(unsupported.element("scene-wrap").classList.contains("has-error"));
assert.equal(unsupported.element("scene-wrap").attrs["aria-busy"], "false");
assert.equal(unsupported.element("content-menu").open, true);
assert.equal(unsupported.element("room-canvas").tabIndex, -1);
unsupported.events.keydown({ key: "Escape" });
assert.equal(unsupported.element("content-menu").open, false);
assert.equal(unsupported.element("content-menu:summary").focused, true);
unsupported.element("content-menu").open = true;
unsupported.events.pointerdown({ target: unsupported.element("room-canvas") });
assert.equal(unsupported.element("content-menu").open, false);
assert.equal(unsupported.links[0].href, "/life/reflection/");
assert(!unsupported.links[0].handlers.click, "Keep normal anchor navigation and modifier-click behavior");
for (const link of unsupported.links.slice(1)) {
  let prevented = false;
  link.handlers.click({ preventDefault: () => { prevented = true; } });
  assert(prevented);
  assert(unsupported.element("link-toast").classList.contains("show"));
  assert(unsupported.element("link-toast").textContent.includes("还在整理中"));
}
assert.equal(unsupported.navigation.length, 0);
const offline = shell(true);
await new Promise((resolve) => setImmediate(resolve));
assert(offline.element("scene-wrap").classList.contains("has-error"), "Failed module imports must reveal the fallback");
assert.equal(offline.links[0].href, "/life/reflection/");
assert.equal(offline.element("content-menu").open, true);

console.log(JSON.stringify({
  status: "PASS", modelKB: Math.round(bytes.length / 1024), meshCount: meshes.length,
  triangles, clickableScenarios,
  objectFeedback: "hover/press scales, support contact, restoration and reduced motion",
  playerLid: "closed initially, hinged opening, reversal and reduced motion",
  curtains: "dense smooth folds, dedicated physical fabric, embedded occlusion atlas",
  daylight: "window bounds, sun/moon/stars, lamp beam, transitions, restoration and reduced motion",
  furnitureFit: "desk against wall, separate legs, flush shelves and shared upright",
  shellFallbacks: "unsupported import maps, failed module, placeholder links",
  cameraFramingScenarios: framingScenarios,
  packedTextures: (JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength)).images || []).length,
  boundsMetres: size.toArray().map((v) => +v.toFixed(2))
}, null, 2));

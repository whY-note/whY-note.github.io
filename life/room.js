import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DEFAULT_VIEW, getRoomFrame, applyPanoramaCrop, configureRoomCamera } from "./room-view.js";
import { createScaleFeedback, updateScaleFeedback, createLidFeedback, updateLidFeedback } from "./room-feedback.js";
import { getRoomDaylight } from "./room-daylight.js";
import { createRoomLighting } from "./room-lighting.js";
import { refineWindowScenery } from "./room-scenery.js";

const OBJECT_LINKS = {
  Journal: "reflection", Notes: "notes", TravelAlbum: "travelAlbum",
  WorldMap: "worldMap", RecordPlayer: "music"
};
const MIN_ZOOM = .94;
const MAX_ZOOM = 1.22;

export async function initialiseRoom({ activate, unavailable }) {
  const stage = document.getElementById("scene-wrap");
  const canvas = document.getElementById("room-canvas");
  const poster = document.getElementById("room-poster");
  const loading = document.getElementById("loading-status");
  const toolbar = document.querySelector(".scene-toolbar");
  const hint = document.querySelector(".gesture-hint");
  const zoomIn = document.getElementById("zoom-in");
  const zoomOut = document.getElementById("zoom-out");
  const panLeft = document.getElementById("pan-left");
  const panRight = document.getElementById("pan-right");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  } catch (error) {
    console.warn("WebGL unavailable:", error);
    unavailable("当前设备暂不支持三维房间，请使用支持 WebGL 的设备或浏览器打开。");
    return;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.setClearColor(0xc9c0ad);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(DEFAULT_VIEW.fov, 1, .1, 60);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = !reducedMotion.matches;
  controls.dampingFactor = .10;
  controls.rotateSpeed = .22;
  controls.minAzimuthAngle = THREE.MathUtils.degToRad(-6);
  controls.maxAzimuthAngle = THREE.MathUtils.degToRad(6);
  controls.minPolarAngle = THREE.MathUtils.degToRad(87);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(93);
  controls.mouseButtons.RIGHT = null;
  controls.touches.TWO = null;
  canvas.style.cursor = "grab";

  const hemisphere = new THREE.HemisphereLight(0xfff1d9, 0x7b7565, 1.8);
  scene.add(hemisphere);
  // Approximate bounced indoor light so the ceiling and shelf recesses stay soft.
  const ambient = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambient);
  const sunlight = new THREE.DirectionalLight(0xffe0b3, 2.8);
  sunlight.position.set(-3.1, 4, -2.4);
  sunlight.target.position.set(0, .2, 1);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: .1, far: 24 });
  sunlight.shadow.normalBias = .018;
  sunlight.shadow.bias = -.0001;
  scene.add(sunlight, sunlight.target);
  const fill = new THREE.DirectionalLight(0xe8eeff, 1.05);
  fill.position.set(1, 3.1, 4);
  scene.add(fill);

  let model;
  let viewSettings = DEFAULT_VIEW;
  let frame;
  let panOffset = 0;
  let animationFrame = 0;
  let ready = false;
  let disposed = false;
  let failed = false;
  let focused = null;
  let pressed = null;
  let activation = null;
  let lastRenderTime = 0;
  let playerLid = null;
  let roomLighting = null;
  const meshes = [];
  const interactiveObjects = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const abort = new AbortController();
  const pointers = new Map();
  let gestureMoved = false;
  let pinch = null;

  function requestRender() {
    if (!animationFrame && !disposed && !failed && !document.hidden) animationFrame = requestAnimationFrame(render);
  }
  function render(now) {
    animationFrame = 0;
    if (disposed || failed || document.hidden) return;
    if (activation && now >= activation.at) {
      const pending = activation;
      activation = null;
      pressed = null;
      if (!pending.hover) setHighlight(null);
      activate(pending.key);
    }
    const delta = lastRenderTime ? Math.min(now - lastRenderTime, 32) : 16;
    lastRenderTime = now;
    let scaling = false;
    for (const item of interactiveObjects) {
      const target = item.key === pressed || (item.key === "music" && playerLid?.isOpen)
        ? 1.065 : item.key === focused ? 1.045 : 1;
      scaling = updateScaleFeedback(item.feedback, target, delta, reducedMotion.matches) || scaling;
    }
    const opening = playerLid && updateLidFeedback(playerLid, delta, reducedMotion.matches);
    const changingLight = roomLighting?.update(now, reducedMotion.matches);
    if (scaling || opening) renderer.shadowMap.needsUpdate = true;
    controls.update();
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    zoomIn.disabled = camera.zoom >= MAX_ZOOM - .001;
    zoomOut.disabled = camera.zoom <= MIN_ZOOM + .001;
    panLeft.disabled = panOffset <= .5;
    panRight.disabled = panOffset >= frame.panMax - .5;
    if (scaling || opening || activation || changingLight) requestRender();
    if (!animationFrame) lastRenderTime = 0;
  }
  function crop(offset) {
    panOffset = applyPanoramaCrop(camera, frame, offset);
    poster.style.objectPosition = `${frame.panMax ? panOffset / frame.panMax * 100 : 50}% center`;
    requestRender();
  }
  function zoom(value) {
    camera.zoom = THREE.MathUtils.clamp(value, MIN_ZOOM, MAX_ZOOM);
    camera.updateProjectionMatrix();
    requestRender();
  }
  function pose(nextFrame, { progress = 0, zoomValue = 1, theta = 0, phi = Math.PI / 2 } = {}) {
    // Flush any old damping before changing the reference pose or orientation.
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    frame = nextFrame;
    controls.enabled = !frame.panoramic;
    controls.target.set(0, frame.view.eyeHeight, frame.view.wallZ);
    controls.minDistance = controls.maxDistance = frame.distance;
    configureRoomCamera(camera, frame, progress * frame.panMax);
    if (!frame.panoramic) {
      const offset = new THREE.Vector3().setFromSpherical(new THREE.Spherical(frame.distance, phi, theta));
      camera.position.copy(controls.target).add(offset);
    }
    controls.update();
    controls.enableDamping = damping;
    camera.zoom = THREE.MathUtils.clamp(zoomValue, MIN_ZOOM, MAX_ZOOM);
    crop(progress * frame.panMax);
    panLeft.hidden = panRight.hidden = !frame.panoramic;
    hint.textContent = frame.panoramic ? "左右拖动查看 · 双指缩放 · 点击物品" : "小幅拖动环视 · 滚轮缩放 · 点击物品";
  }
  function resize() {
    if (disposed || failed || !stage.clientWidth || !stage.clientHeight) return;
    const next = getRoomFrame(stage.clientWidth, stage.clientHeight, viewSettings);
    const preserve = frame && frame.panoramic === next.panoramic;
    const previous = preserve ? {
      progress: frame.panMax ? panOffset / frame.panMax : 0,
      zoomValue: camera.zoom,
      theta: controls.getAzimuthalAngle(), phi: controls.getPolarAngle()
    } : {};
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, next.panoramic ? 1.5 : 2));
    renderer.setSize(next.width, next.height, false);
    pose(next, previous);
  }
  function clearFeedback() {
    pressed = null;
    activation = null;
    setHighlight(null);
    requestRender();
  }
  function resetView() { if (frame) pose(frame); clearFeedback(); }
  function parentLink(object) {
    while (object && object !== model) {
      if (OBJECT_LINKS[object.name]) return OBJECT_LINKS[object.name];
      object = object.parent;
    }
    return null;
  }
  function setHighlight(key) {
    if (focused === key) return;
    focused = key;
    for (const item of interactiveObjects) {
      item.object.traverse((object) => {
        if (!object.isMesh) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!material.emissive || !material.userData.baseEmissive) continue;
          material.emissive.copy(material.userData.baseEmissive);
          if (item.key === key) material.emissive.add(new THREE.Color(.028, .045, .035));
        }
      });
    }
    requestRender();
  }
  function pick(clientX, clientY) {
    if (!ready) return null;
    const rect = canvas.getBoundingClientRect();
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld();
    model.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    return hit ? parentLink(hit.object) : null;
  }
  function pinchDistance() {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  controls.addEventListener("change", requestRender);
  controls.addEventListener("start", () => setHighlight(null));
  document.getElementById("reset-view").addEventListener("click", resetView);
  zoomIn.addEventListener("click", () => zoom(camera.zoom * 1.08));
  zoomOut.addEventListener("click", () => zoom(camera.zoom / 1.08));
  panLeft.addEventListener("click", () => crop(panOffset - frame.width * .65));
  panRight.addEventListener("click", () => crop(panOffset + frame.width * .65));
  canvas.addEventListener("wheel", (event) => {
    if (!ready) return;
    event.preventDefault();
    zoom(camera.zoom * Math.exp(-THREE.MathUtils.clamp(event.deltaY, -150, 150) * .001));
  }, { passive: false });
  canvas.addEventListener("pointerdown", (event) => {
    if (!ready || event.button !== 0) return;
    if (!pointers.size) gestureMoved = false;
    pointers.set(event.pointerId, { startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY });
    if (pointers.size > 1) {
      gestureMoved = true;
      pinch = { distance: pinchDistance(), zoom: camera.zoom };
    }
    if (frame.panoramic) canvas.setPointerCapture(event.pointerId);
    activation = null;
    pressed = pointers.size === 1 ? pick(event.clientX, event.clientY) : null;
    setHighlight(pressed);
    requestRender();
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!ready) return;
    const current = pointers.get(event.pointerId);
    if (current) {
      const dx = event.clientX - current.x;
      current.x = event.clientX; current.y = event.clientY;
      if (Math.hypot(current.x - current.startX, current.y - current.startY) > 6) {
        gestureMoved = true;
        clearFeedback();
      }
      if (pointers.size > 1 && pinch?.distance > 0) zoom(pinch.zoom * pinchDistance() / pinch.distance);
      else if (frame.panoramic) crop(panOffset - dx);
    } else if (event.pointerType === "mouse") {
      const key = pick(event.clientX, event.clientY);
      setHighlight(key);
      canvas.style.cursor = key ? "pointer" : "grab";
    }
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!ready) return;
    const current = pointers.get(event.pointerId);
    pointers.delete(event.pointerId);
    pinch = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    pressed = null;
    canvas.style.cursor = "grab";
    if (current && !gestureMoved && event.button === 0 && !pointers.size) {
      const key = pick(event.clientX, event.clientY);
      if (key) {
        pressed = key;
        setHighlight(key);
        canvas.style.cursor = event.pointerType === "mouse" ? "pointer" : "grab";
        if (key === "music") {
          // The physical player opens its lid; the menu keeps the music link.
          playerLid.isOpen = !playerLid.isOpen;
          pressed = null;
          if (event.pointerType !== "mouse") setHighlight(null);
        } else {
          // Briefly show the press response before following the link.
          activation = { key, at: performance.now() + 120, hover: event.pointerType === "mouse" };
        }
      } else setHighlight(null);
    } else setHighlight(null);
    requestRender();
  });
  canvas.addEventListener("pointercancel", (event) => { pointers.delete(event.pointerId); gestureMoved = true; pinch = null; clearFeedback(); canvas.style.cursor = "grab"; });
  canvas.addEventListener("pointerleave", () => { if (!pointers.size) setHighlight(null); });
  canvas.addEventListener("keydown", (event) => {
    if (!ready) return;
    if (event.key === "Home") resetView();
    else if (event.key === "+" || event.key === "=") zoom(camera.zoom * 1.08);
    else if (event.key === "-") zoom(camera.zoom / 1.08);
    else if (frame.panoramic && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
      crop(panOffset + (event.key === "ArrowLeft" ? -1 : 1) * frame.width * .4);
    } else if (!frame.panoramic && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      const step = THREE.MathUtils.degToRad(2);
      if (event.key === "ArrowLeft") spherical.theta -= step;
      if (event.key === "ArrowRight") spherical.theta += step;
      if (event.key === "ArrowUp") spherical.phi -= step;
      if (event.key === "ArrowDown") spherical.phi += step;
      spherical.theta = THREE.MathUtils.clamp(spherical.theta, controls.minAzimuthAngle, controls.maxAzimuthAngle);
      spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
      controls.update();
    } else return;
    event.preventDefault();
    requestRender();
  });

  function fail(message) {
    failed = true; ready = false;
    activation = null;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    unavailable(message);
  }
  stage.addEventListener("roomdaylightchange", (event) => {
    if (disposed || failed || !roomLighting) return;
    const { state, immediate } = event.detail;
    if (roomLighting.setMode(state.mode, { immediate: immediate || reducedMotion.matches })) requestRender();
  }, { signal: abort.signal });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    fail("三维视图已暂停，请刷新重试。");
  });
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = 0; }
    else requestRender();
  });
  reducedMotion.addEventListener("change", () => { controls.enableDamping = !reducedMotion.matches; requestRender(); });
  resize();

  // A page in the back-forward cache keeps the scene; real exit releases it.
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;
    disposed = true;
    activation = null;
    abort.abort();
    if (animationFrame) cancelAnimationFrame(animationFrame);
    observer.disconnect(); controls.dispose();
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    for (const texture of textures) { texture.source?.data?.close?.(); texture.dispose(); }
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
    roomLighting?.dispose(); sunlight.shadow.dispose(); renderer.dispose();
  });
  window.addEventListener("pageshow", (event) => { if (event.persisted) requestRender(); });

  const timeout = setTimeout(() => abort.abort(), 25000);
  try {
    const response = await fetch(new URL("./models/room.glb", import.meta.url), { signal: abort.signal });
    if (!response.ok) throw new Error(`Model request failed: ${response.status}`);
    const data = await response.arrayBuffer();
    clearTimeout(timeout);
    if (disposed || failed) return;
    const gltf = await new GLTFLoader().parseAsync(data, new URL("./models/", import.meta.url).href);
    if (disposed || failed) return;
    model = gltf.scene;
    refineWindowScenery(model);
    viewSettings = model.getObjectByName("RoomShell")?.userData.view || DEFAULT_VIEW;
    model.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = object.receiveShadow = !object.name.includes("NoShadow");
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material.name === "Curtain linen") {
          material.aoMapIntensity = .45;
          if (material.isMeshPhysicalMaterial) material.sheen = .20;
        }
      }
      meshes.push(object);
    });
    scene.add(model); scene.updateMatrixWorld(true);
    roomLighting = createRoomLighting({ scene, model, renderer, hemisphere, ambient, sunlight, fill });
    roomLighting.setMode(getRoomDaylight().mode, { immediate: true });
    const lid = model.getObjectByName("TurntableDustCover");
    if (!lid || !Number.isFinite(lid.userData.openAngle)) throw new Error("Missing turntable lid hinge");
    playerLid = createLidFeedback(lid);
    for (const [name, key] of Object.entries(OBJECT_LINKS)) {
      const object = model.getObjectByName(name);
      if (!object) throw new Error(`Missing interactive Blender object: ${name}`);
      object.traverse((child) => {
        if (!child.isMesh) return;
        const clone = (material) => {
          const copy = material.clone();
          if (copy.emissive) copy.userData.baseEmissive = copy.emissive.clone();
          return copy;
        };
        child.material = Array.isArray(child.material) ? child.material.map(clone) : clone(child.material);
      });
      interactiveObjects.push({ key, object, feedback: createScaleFeedback(object, name === "WorldMap") });
    }
    resize();
    renderer.shadowMap.needsUpdate = true;
    await renderer.compileAsync(scene, camera);
    if (disposed || failed) return;
    ready = true;
    toolbar.hidden = false; loading.hidden = true;
    stage.classList.add("is-ready");
    stage.setAttribute("aria-busy", "false");
    requestRender();
  } catch (error) {
    if (disposed) return;
    console.error("Life Room model could not load:", error);
    fail("房间暂时未能加载，请刷新重试。");
  } finally { clearTimeout(timeout); }
}

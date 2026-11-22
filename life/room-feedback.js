import * as THREE from "three";

// Keep tabletop objects on their support, and the map against the wall.
export function createScaleFeedback(object, wallMounted = false) {
  object.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(object);
  const anchor = bounds.getCenter(new THREE.Vector3());
  if (wallMounted) anchor.z = bounds.min.z;
  else anchor.y = bounds.min.y;
  const offset = object.worldToLocal(anchor).multiply(object.scale).applyQuaternion(object.quaternion);
  return {
    object, position: object.position.clone(), scale: object.scale.clone(),
    offset, factor: 1
  };
}

export function updateScaleFeedback(state, target, deltaMs, reducedMotion = false) {
  const next = reducedMotion || Math.abs(state.factor - target) < .0001
    ? target
    : THREE.MathUtils.lerp(state.factor, target, 1 - Math.exp(-deltaMs / 55));
  if (next === state.factor) return false;
  state.factor = next;
  state.object.scale.copy(state.scale).multiplyScalar(next);
  state.object.position.copy(state.position).addScaledVector(state.offset, 1 - next);
  return true;
}

export function createLidFeedback(object) {
  const closed = object.quaternion.clone();
  const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), object.userData.openAngle);
  return { object, closed, open: closed.clone().multiply(turn), progress: 0, isOpen: false };
}

export function updateLidFeedback(state, deltaMs, reducedMotion = false) {
  const target = state.isOpen ? 1 : 0;
  const next = reducedMotion || Math.abs(state.progress - target) < .0005
    ? target
    : THREE.MathUtils.lerp(state.progress, target, 1 - Math.exp(-deltaMs / 85));
  if (next === state.progress) return false;
  state.progress = next;
  state.object.quaternion.slerpQuaternions(state.closed, state.open, next);
  return true;
}

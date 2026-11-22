// The same values are embedded as RoomShell.extras.view by the Blender builder.
export const DEFAULT_VIEW = Object.freeze({
  wallWidth: 7.4, wallHeight: 3.8, wallZ: -1.8, eyeHeight: 1.84,
  fov: 35, panoramaAspect: 1.5, wallWidthFraction: .84, wallHeightFraction: .68
});

// A portrait viewport crops a full-height panorama instead of miniaturising it.
export function getRoomFrame(width, height, settings = DEFAULT_VIEW) {
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  const view = { ...DEFAULT_VIEW, ...settings };
  const panoramic = width / height < 1.2;
  const fullWidth = panoramic ? Math.max(width, Math.ceil(height * view.panoramaAspect)) : width;
  const tangent = Math.tan(view.fov * Math.PI / 360);
  const distance = Math.max(
    view.wallWidth / (view.wallWidthFraction * 2 * (fullWidth / height) * tangent),
    view.wallHeight / (view.wallHeightFraction * 2 * tangent)
  );
  return { width, height, fullWidth, panoramic, panMax: fullWidth - width, distance, view };
}

export function applyPanoramaCrop(camera, frame, offset = 0) {
  const bounded = Math.max(0, Math.min(frame.panMax, offset));
  if (frame.panoramic) {
    camera.setViewOffset(frame.fullWidth, frame.height, bounded, 0, frame.width, frame.height);
  } else {
    camera.clearViewOffset();
    camera.aspect = frame.width / frame.height;
  }
  camera.updateProjectionMatrix();
  return bounded;
}

export function configureRoomCamera(camera, frame, offset = 0) {
  camera.fov = frame.view.fov;
  camera.zoom = 1;
  camera.position.set(0, frame.view.eyeHeight, frame.view.wallZ + frame.distance);
  camera.lookAt(0, frame.view.eyeHeight, frame.view.wallZ);
  applyPanoramaCrop(camera, frame, offset);
  camera.updateMatrixWorld();
}

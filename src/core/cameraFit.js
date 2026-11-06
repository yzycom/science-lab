import * as THREE from 'three';

/**
 * 按包围盒把透视相机拉到刚好框住整个场景的位置。
 * 只向外拉、不向内推：本来就能看全的分子取景保持原样。
 *
 * @param {THREE.PerspectiveCamera} camera
 * @param {{target: THREE.Vector3, update: Function}} controls
 * @param {number[]} min 包围盒最小角 [x,y,z]
 * @param {number[]} max 包围盒最大角 [x,y,z]
 * @param {number} [padding] 额外留白系数
 */
export function fitCameraToBounds(camera, controls, min, max, padding = 1.1) {
  const center = new THREE.Vector3(
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  );
  // 按包围盒的宽/高分别算所需距离，比用外接球更贴边（外接球会把斜对角也算进去）
  const halfW = Math.max((max[0] - min[0]) / 2, 0.5);
  const halfH = Math.max((max[1] - min[1]) / 2, 0.5);
  const halfFov = (camera.fov * Math.PI) / 360;
  const distW = halfW / (Math.tan(halfFov) * Math.max(camera.aspect, 0.2));
  const distH = halfH / Math.tan(halfFov);
  // 精确取景：内容始终按当前画布比例铺满（留 padding 边距）。
  // 这样窗口放大/缩小、换课时，画面占比保持一致，不会一会儿太远一会儿被切。
  const next = Math.max(distW, distH) * padding;

  const dir = camera.position.clone().sub(controls.target);
  if (dir.lengthSq() < 1e-6) dir.set(0, 0.4, 1);
  dir.normalize();

  controls.target.copy(center);
  camera.position.copy(center.clone().add(dir.multiplyScalar(next)));
  camera.lookAt(center);
  controls.update();
}

/** 由原子坐标数组求包围盒；空数组返回 null。 */
export function boundsOfPoints(points) {
  if (!points || points.length === 0) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const point of points) {
    if (!point) continue;
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i], point[i]);
      max[i] = Math.max(max[i], point[i]);
    }
  }
  if (!Number.isFinite(min[0])) return null;
  return { min, max };
}
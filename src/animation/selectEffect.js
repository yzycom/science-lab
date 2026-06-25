import anime from 'animejs';

let currentSelectAnimation = null;

/**
 * 元素选中动画：弹跳 + 持续脉冲发光
 * @param {THREE.Group} group
 */
export function animateSelect(group) {
  // 停止之前的脉冲
  if (currentSelectAnimation) {
    anime.remove(currentSelectAnimation.targets);
  }

  const basePos = group.userData.basePosition;
  const mesh = group.children[0];

  // 初始弹跳
  anime({
    targets: group.position,
    y: [
      { value: basePos[1] + 0.7, duration: 200, easing: 'easeOutQuad' },
      { value: basePos[1] + 0.5, duration: 250, easing: 'easeInOutSine' }
    ],
  });

  // 持续脉冲发光
  currentSelectAnimation = anime({
    targets: mesh.material,
    emissiveIntensity: [0.35, 0.15],
    duration: 1000,
    easing: 'easeInOutSine',
    direction: 'alternate',
    loop: true,
  });
}

/**
 * 取消选中：恢复静止
 * @param {THREE.Group} group
 */
export function animateDeselect(group) {
  if (currentSelectAnimation) {
    anime.remove(currentSelectAnimation.targets);
    currentSelectAnimation = null;
  }

  const basePos = group.userData.basePosition;
  const mesh = group.children[0];

  anime({
    targets: group.position,
    y: basePos[1],
    z: basePos[2],
    duration: 300,
    easing: 'easeOutCubic',
  });

  anime({
    targets: mesh.material,
    emissiveIntensity: 0.0,
    duration: 200,
    easing: 'linear',
  });
}

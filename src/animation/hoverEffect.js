import anime from 'animejs';

/**
 * 元素方块 hover 动画（抬起 + 放大 + 发光）
 * @param {THREE.Group} group - 元素方块 Group
 * @param {boolean} hovered - 是否进入 hover
 */
export function animateHover(group, hovered) {
  anime.remove(group.position);
  anime.remove(group.scale);
  
  const basePos = group.userData.basePosition;
  const mesh = group.children[0];
  
  if (hovered) {
    // 抬起 + 放大
    anime({
      targets: group.position,
      y: basePos[1] + 0.4,
      z: basePos[2] + 0.6,
      duration: 350,
      easing: 'easeOutBack',
    });
    
    anime({
      targets: group.scale,
      x: 1.08,
      y: 1.08,
      z: 1.08,
      duration: 300,
      easing: 'easeOutCubic',
    });
    
    // 材质发光
    anime({
      targets: mesh.material,
      emissiveIntensity: 0.28,
      duration: 200,
      easing: 'linear',
    });
    
    document.body.style.cursor = 'pointer';
  } else {
    // 复位
    anime({
      targets: group.position,
      y: basePos[1],
      z: basePos[2],
      duration: 280,
      easing: 'easeOutCubic',
    });
    
    anime({
      targets: group.scale,
      x: 1.0,
      y: 1.0,
      z: 1.0,
      duration: 250,
      easing: 'easeOutCubic',
    });
    
    anime({
      targets: mesh.material,
      emissiveIntensity: 0.0,
      duration: 180,
      easing: 'linear',
    });
    
    document.body.style.cursor = 'default';
  }
}

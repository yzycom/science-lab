import anime from 'animejs';

/**
 * 渲染化合物列表（复用 lesson-item 样式）
 * @param {Array} compounds
 * @param {Function} onSelect - (compound) => void
 */
export function renderCompoundList(compounds, onSelect) {
  const list = document.getElementById('compoundList');
  list.innerHTML = compounds.map(c => `
    <button class="lesson-item" data-id="${c.id}">
      <strong>${c.formula}</strong>
      <span>${c.name}</span>
    </button>
  `).join('');

  // 错开淡入
  anime({
    targets: list.querySelectorAll('.lesson-item'),
    opacity: [0, 1],
    translateY: [12, 0],
    duration: 300,
    easing: 'easeOutCubic',
    delay: anime.stagger(30),
  });

  const items = [...list.querySelectorAll('.lesson-item')];
  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const compound = compounds.find(c => c.id === item.dataset.id);
      if (compound) onSelect(compound);
    });
  });

  // 默认选中第一个
  if (items.length > 0) {
    items[0].classList.add('active');
    onSelect(compounds[0]);
  }
}

/**
 * 显示化合物工作台
 */
export function showCompoundWorkbench() {
  const workbench = document.getElementById('compoundWorkbench');
  workbench.classList.add('visible');
  workbench.setAttribute('aria-hidden', 'false');
}

/**
 * 隐藏化合物工作台
 */
export function hideCompoundWorkbench() {
  const workbench = document.getElementById('compoundWorkbench');
  workbench.classList.remove('visible');
  workbench.setAttribute('aria-hidden', 'true');
}

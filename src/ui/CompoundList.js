import anime from 'animejs';

/**
 * 渲染化合物列表面板
 * @param {Array} compounds
 * @param {Function} onSelect - (compound) => void
 */
export function renderCompoundList(compounds, onSelect) {
  const list = document.getElementById('compoundList');
  list.innerHTML = compounds.map(c => `
    <div class="compound-item" data-id="${c.id}">
      <span class="compound-formula">${c.formula}</span>
      <span class="compound-name">${c.name}</span>
    </div>
  `).join('');

  // 错开淡入
  anime({
    targets: list.querySelectorAll('.compound-item'),
    opacity: [0, 1],
    translateY: [12, 0],
    duration: 300,
    easing: 'easeOutCubic',
    delay: anime.stagger(30),
  });

  list.querySelectorAll('.compound-item').forEach(item => {
    item.addEventListener('click', () => {
      list.querySelectorAll('.compound-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const compound = compounds.find(c => c.id === item.dataset.id);
      if (compound) onSelect(compound);
    });
  });
}

/**
 * 显示化合物面板
 */
export function showCompoundPanel() {
  const panel = document.getElementById('compoundPanel');
  panel.classList.add('visible');
  anime({
    targets: panel,
    translateX: ['-20px', '0px'],
    opacity: [0, 1],
    duration: 320,
    easing: 'easeOutCubic',
  });
}

/**
 * 隐藏化合物面板
 */
export function hideCompoundPanel() {
  const panel = document.getElementById('compoundPanel');
  anime({
    targets: panel,
    translateX: ['0px', '-20px'],
    opacity: [1, 0],
    duration: 240,
    easing: 'easeInCubic',
    complete: () => {
      panel.classList.remove('visible');
      panel.style.opacity = '';
      panel.style.transform = '';
    },
  });
}

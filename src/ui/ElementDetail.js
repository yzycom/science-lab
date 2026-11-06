import { CATEGORY_COLORS, CATEGORY_NAMES_ZH } from '../data/layout.js';
import { getShells, SHELL_NAMES } from '../data/shells.js';
import { createAtomScene } from '../core/AtomScene.js';
import { showPanel, hidePanel } from '../animation/panelTransition.js';

let currentAtomScene = null;
// 场景是在双 rAF 之后才创建的；这期间用户可能已经关掉面板或换了元素。
// 用一个递增令牌作废过期的创建请求，否则那个场景会挂在一个已被清空的容器上：
// 画布留着、渲染循环也停不下来，等于又漏一个 GL 上下文。
let atomSceneToken = 0;

function disposeAtomScene(atomContainer) {
  if (currentAtomScene) {
    currentAtomScene.destroy();
    currentAtomScene = null;
  }
  if (atomContainer) atomContainer.innerHTML = '';
}

/**
 * 渲染元素详情面板
 * @param {object} element - 元素数据
 * @param {Function} onClose
 */
export function renderElementDetail(element, onClose) {
  const panel = document.getElementById('elementDetail');
  const atomContainer = document.getElementById('atomCanvas');

  // 作废上一轮尚未执行的延迟创建，并销毁旧的原子场景
  const token = ++atomSceneToken;
  disposeAtomScene(atomContainer);

  if (!element) {
    if (panel.classList.contains('visible')) {
      hidePanel(panel);
    }
    return;
  }

  const color = CATEGORY_COLORS[element.category] || '#8c8a7c';
  const categoryZh = CATEGORY_NAMES_ZH[element.category] || element.category;
  const shells = getShells(element.z);
  const shellStr = shells.map((n, i) => `${SHELL_NAMES[i]}:${n}`).join('  ');
  const neutrons = Math.max(0, Math.round(element.mass) - element.z);

  // 分类 + 标题
  panel.querySelector('.detail-category').textContent = categoryZh;
  panel.querySelector('.detail-symbol').textContent = element.symbol;
  panel.querySelector('.detail-symbol').style.color = color;
  panel.querySelector('.detail-name').textContent = element.name;

  // 电子层
  const shellsEl = panel.querySelector('.detail-shells');
  shellsEl.innerHTML = `<span style="color: var(--text-muted)">电子层：</span>${shellStr}`;

  // 粒子图例
  const legendEl = panel.querySelector('.atom-legend');
  legendEl.innerHTML = `
    <span>🔴 质子 ${element.z}</span>
    <span>⚪ 中子 ${neutrons}</span>
    <span>🔵 电子 ${element.z}</span>
  `;

  // 属性列表
  const props = [
    ['原子序数', element.z],
    ['原子量', element.mass + ' u'],
    ['分类', categoryZh],
    ['族 / 周期', `${element.group} / ${element.period}`],
    ['电负性', element.electronegativity ?? '—'],
    ['原子半径', element.radius ? element.radius + ' pm' : '—'],
  ];
  const propsEl = panel.querySelector('.detail-props');
  propsEl.innerHTML = props.map(([label, val]) => `
    <div class="prop-item">
      <div class="prop-label">${label}</div>
      <div class="prop-value">${val}</div>
    </div>
  `).join('');

  // 显示面板
  showPanel(panel);

  // 原子场景（延迟到面板可见后初始化，保证容器有尺寸）
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (token !== atomSceneToken) return;
      currentAtomScene = createAtomScene(atomContainer, element);
    });
  });

  // 关闭按钮
  panel.querySelector('.detail-close').onclick = () => {
    atomSceneToken += 1;
    disposeAtomScene(atomContainer);
    hidePanel(panel);
    if (onClose) onClose();
  };
}

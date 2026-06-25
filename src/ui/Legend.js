import { CATEGORY_COLORS, CATEGORY_NAMES_ZH } from '../data/layout.js';

/**
 * 渲染分类图例
 */
export function renderLegend() {
  const el = document.getElementById('legend');
  el.innerHTML = Object.entries(CATEGORY_COLORS).map(([cat, color]) => `
    <div class="legend-item">
      <div class="legend-color" style="background:${color}"></div>
      <span class="legend-label">${CATEGORY_NAMES_ZH[cat] || cat}</span>
    </div>
  `).join('');
}

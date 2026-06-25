import { createMoleculeScene } from '../core/MoleculeScene.js';
import { showPanel, hidePanel } from '../animation/panelTransition.js';

let currentMoleculeScene = null;

/**
 * 渲染化合物详情面板
 * @param {object|null} compound - 化合物数据，null 表示关闭
 * @param {Function} onClose
 */
export function renderCompoundDetail(compound, onClose) {
  const panel = document.getElementById('compoundDetail');
  const molContainer = document.getElementById('moleculeCanvas');

  // 销毁旧分子场景
  if (currentMoleculeScene) {
    currentMoleculeScene.destroy();
    currentMoleculeScene = null;
    molContainer.innerHTML = '';
  }

  if (!compound) {
    if (panel.classList.contains('visible')) {
      hidePanel(panel);
    }
    return;
  }

  // 填充面板内容
  panel.querySelector('.compound-detail-formula').textContent = compound.formula;
  panel.querySelector('.compound-detail-name').textContent = compound.name;
  panel.querySelector('.compound-detail-name-en').textContent = compound.nameEn;
  panel.querySelector('.compound-detail-desc').textContent = compound.desc;

  const statsEl = panel.querySelector('.compound-stats');
  statsEl.innerHTML = `
    <span>原子数 <strong>${compound.atoms.length}</strong></span>
    <span>化学键 <strong>${compound.bonds.length}</strong></span>
    <span>🟠 小球 = 共用电子对</span>
  `;

  // 显示面板
  showPanel(panel);

  // 延迟两帧确保容器有尺寸
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      currentMoleculeScene = createMoleculeScene(molContainer, compound);
    });
  });

  // 关闭按钮
  panel.querySelector('.compound-detail-close').onclick = () => {
    if (currentMoleculeScene) {
      currentMoleculeScene.destroy();
      currentMoleculeScene = null;
      molContainer.innerHTML = '';
    }
    hidePanel(panel);
    if (onClose) onClose();
  };
}

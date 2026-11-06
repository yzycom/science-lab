import { createMoleculeScene } from '../core/MoleculeScene.js';
import { cancelDetailSwap, swapDetailContent } from './detailSwap.js';

let currentMoleculeScene = null;
// 同 ElementDetail：分子场景要等两帧拿到容器尺寸才创建，
// 期间再点另一个化合物会让旧场景挂进已被清空的容器里，永久占住一个 GL 上下文。
let moleculeSceneToken = 0;

function disposeMoleculeScene() {
  if (currentMoleculeScene) {
    currentMoleculeScene.destroy();
    currentMoleculeScene = null;
  }
}

/**
 * 渲染化合物详情（独立工作台，画布尺寸与结构对齐化学反应渲染器）
 * @param {object|null} compound - 化合物数据，null 表示清空
 */
export function renderCompoundDetail(compound) {
  const detail = document.getElementById('compoundDetail');

  if (!compound) {
    moleculeSceneToken += 1;
    cancelDetailSwap(detail);
    disposeMoleculeScene();
    if (detail) detail.innerHTML = '';
    return;
  }

  // 淡出后再销毁旧场景、构建新场景，把 PBR 环境贴图和 shader 编译的耗时
  // 藏在画面已经隐去的那 140ms 里，避免点击瞬间整块详情区冻住。
  const token = ++moleculeSceneToken;

  swapDetailContent(detail, () => {
    disposeMoleculeScene();

    detail.innerHTML = '';
    detail.className = 'edulab-view edulab-compound-view';

    const side = document.createElement('section');
    side.className = 'edulab-side-panel';
    const canvasHost = document.createElement('div');
    canvasHost.className = 'edulab-canvas-host';
    // 面板在左、画布在右，与化学反应/立体几何/解析几何保持同一顺序。
    detail.append(side, canvasHost);

    side.innerHTML = `
    <div class="edulab-kicker">COMPOUND</div>
    <h2>${compound.formula}　${compound.name}</h2>
    <p class="edulab-subtitle">${compound.nameEn || ''}</p>
    <div class="edulab-chip-row">
      <span class="edulab-chip">原子数 ${compound.atoms.length}</span>
      <span class="edulab-chip">化学键 ${compound.bonds.length}</span>
    </div>
    <div class="edulab-steps">
      <article class="edulab-step">
        <strong>分子结构</strong>
        <div>${compound.desc || ''}</div>
      </article>
    </div>
    <div class="compound-bond-legend">
      <div class="bond-legend-item">
        <div class="bond-line bond-single"></div>
        <span>单键 · 1对共用电子</span>
      </div>
      <div class="bond-legend-item">
        <div class="bond-lines">
          <div class="bond-line bond-double"></div>
          <div class="bond-line bond-double"></div>
        </div>
        <span>双键 · 2对</span>
      </div>
      <div class="bond-legend-item">
        <div class="bond-lines">
          <div class="bond-line bond-triple"></div>
          <div class="bond-line bond-triple"></div>
          <div class="bond-line bond-triple"></div>
        </div>
        <span>三键 · 3对</span>
      </div>
    </div>
  `;

    // 延迟两帧确保容器有尺寸；返回 Promise，让淡入等到场景真正建好之后。
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (token !== moleculeSceneToken) {
          resolve();
          return;
        }
        try {
          currentMoleculeScene = createMoleculeScene(canvasHost, compound);
        } finally {
          resolve();
        }
      }));
    });
  });
}

export function clearCompoundDetail() {
  const detail = document.getElementById('compoundDetail');
  moleculeSceneToken += 1;
  cancelDetailSwap(detail);
  disposeMoleculeScene();
  if (detail) detail.innerHTML = '';
}

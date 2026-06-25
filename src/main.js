import * as THREE from 'three';
import elements from './data/elements.json';
import compounds from './data/compounds.json';
import { flatLayout } from './data/layout.js';
import { TableScene } from './core/TableScene.js';
import { createElementBlock } from './objects/ElementBlock.js';
import { animateHover } from './animation/hoverEffect.js';
import { animateSelect, animateDeselect } from './animation/selectEffect.js';
import { renderElementDetail } from './ui/ElementDetail.js';
import { renderLegend } from './ui/Legend.js';
import { renderCompoundList, showCompoundPanel, hideCompoundPanel } from './ui/CompoundList.js';
import { renderCompoundDetail } from './ui/CompoundDetail.js';

// —— 场景初始化 ——
const container = document.getElementById('canvas-container');
const tableScene = new TableScene(container);

// —— 构建元素方块 ——
const elementBlocks = []; // { group, element }

elements.forEach(el => {
  const pos = flatLayout(el);
  const group = createElementBlock(el, pos);
  tableScene.add(group);
  elementBlocks.push(group);
});

// —— Raycaster ——
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 用于碰撞检测的 Mesh 集合（每个 group 的 index=0 子节点）
const hitMeshes = elementBlocks.map(g => g.children[0]);

let hoveredGroup = null;
let selectedGroup = null;

// 鼠标移动：hover
container.addEventListener('pointermove', e => {
  const rect = container.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, tableScene.camera);
  const hits = raycaster.intersectObjects(hitMeshes, false);

  const newHit = hits.length > 0 ? hits[0].object.parent : null;

  if (hoveredGroup !== newHit) {
    // 离开旧 hover（但不影响选中态）
    if (hoveredGroup && hoveredGroup !== selectedGroup) {
      animateHover(hoveredGroup, false);
    }
    // 进入新 hover（不影响选中态）
    if (newHit && newHit !== selectedGroup) {
      animateHover(newHit, true);
    }
    hoveredGroup = newHit;
  }
});

// 鼠标离开画布时重置 hover
container.addEventListener('pointerleave', () => {
  if (hoveredGroup && hoveredGroup !== selectedGroup) {
    animateHover(hoveredGroup, false);
    hoveredGroup = null;
  }
  document.body.style.cursor = 'default';
});

// 点击：选中 / 取消选中
container.addEventListener('click', e => {
  const rect = container.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, tableScene.camera);
  const hits = raycaster.intersectObjects(hitMeshes, false);

  if (hits.length === 0) {
    // 点空白处取消选中
    clearSelection();
    return;
  }

  const clickedGroup = hits[0].object.parent;

  if (selectedGroup === clickedGroup) {
    // 再次点击同一个：取消
    clearSelection();
    return;
  }

  // 取消旧选中
  if (selectedGroup) {
    animateDeselect(selectedGroup);
  }

  // 新选中
  selectedGroup = clickedGroup;
  animateSelect(selectedGroup);

  renderElementDetail(selectedGroup.userData.element, () => {
    clearSelection();
  });
});

function clearSelection() {
  if (selectedGroup) {
    animateDeselect(selectedGroup);
    selectedGroup = null;
  }
  renderElementDetail(null, null);
}

// —— 模式切换 ——
let currentMode = 'table';

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    if (mode === currentMode) return;

    currentMode = mode;

    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    clearSelection();

    if (mode === 'compounds') {
      showCompoundPanel();
      renderCompoundList(compounds, (compound) => {
        renderCompoundDetail(compound, () => {
          // 取消化合物列表中的 active 状态
          document.querySelectorAll('.compound-item').forEach(i => i.classList.remove('active'));
        });
      });
    } else {
      hideCompoundPanel();
      renderCompoundDetail(null, null);
    }
  });
});

// —— 图例 ——
renderLegend();

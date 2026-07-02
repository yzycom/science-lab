import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { cylinderBetween, makeSceneShell, vectorFromArray } from './threeUtils.js';
import { renderLatex } from './katexUtils.js';

// 与元素周期表 unknown 分类同色，未知原子兜底配色统一为该值。
const DEFAULT_COLOR = '#8c8a7c';

export function renderChemReactionLesson(root, payload) {
  root.innerHTML = '';
  root.className = 'edulab-view edulab-chem-view';

  const sceneHost = document.createElement('div');
  sceneHost.className = 'edulab-canvas-host';
  const side = document.createElement('section');
  side.className = 'edulab-side-panel';
  // 面板在左、画布在右，与立体几何/解析几何保持同一顺序，
  // 避免三个 Edulab 渲染器左右镜像不一致。
  root.append(side, sceneHost);

  side.innerHTML = `
    <div class="edulab-kicker">CHEMICAL REACTION</div>
    <h2>${payload.meta?.title || '化学反应'}</h2>
    <p class="edulab-subtitle">${payload.meta?.subtitle || payload.meta?.equation || ''}</p>
    <div class="edulab-chip-row">${renderElementCounts(payload.elementCounts)}</div>
    <label class="edulab-slider-label">反应进度
      <input data-edulab-progress type="range" min="0" max="1" step="0.01" value="0">
    </label>
    <div class="edulab-steps">${renderSteps(payload.steps)}</div>
    ${renderEnergy(payload.energy)}
  `;

  const shell = makeSceneShell(sceneHost, { camera: [0, 4.5, 11] });
  
  // 升级光照与材质，对齐 MoleculeScene 渲染质量
  enhanceSceneLighting(shell.scene, shell.renderer);
  
  const atomState = buildAtoms(shell.scene, payload.atoms || []);
  const bondGroup = new THREE.Group();
  shell.scene.add(bondGroup);

  function draw(progress) {
    atomState.forEach((state) => {
      state.current.lerpVectors(state.start, state.end, progress);
      state.mesh.position.copy(state.current);
    });
    drawBonds(bondGroup, atomState, payload.bonds, progress);
    shell.render();
  }

  const slider = side.querySelector('[data-edulab-progress]');
  slider.addEventListener('input', () => draw(Number(slider.value)));
  draw(0);

  // 化学方程式（meta.equation）与步骤说明文本可能包含 LaTeX 语法，
  // 之前只做了 innerHTML 插入，未做公式渲染，导致页面直接显示 $...$ 源码。
  renderLatex(side);

  return {
    destroy() {
      shell.destroy();
      root.innerHTML = '';
    },
  };
}

function enhanceSceneLighting(scene, renderer) {
  // 清除原有光照（makeSceneShell 已添加环境光和两盏方向光）
  const lights = scene.children.filter(c => c.isLight);
  lights.forEach(l => scene.remove(l));
  
  // 对齐 MoleculeScene 的三点布光方案
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  
  // 主光（key light）：右上偏暖
  const keyLight = new THREE.DirectionalLight(0xfff4e0, 0.9);
  keyLight.position.set(5, 6, 4);
  scene.add(keyLight);
  
  // 补光（fill light）：左下偏冷
  const fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.45);
  fillLight.position.set(-4, -2, 3);
  scene.add(fillLight);
  
  // 边缘光（rim light）：后方偏暖
  const rimLight = new THREE.DirectionalLight(0xffd9b0, 0.55);
  rimLight.position.set(0, 2, -6);
  scene.add(rimLight);
  
  // 环境贴图（PBR 反射）
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const envTexture = pmrem.fromScene(envScene, 0.04).texture;
  scene.environment = envTexture;
  
  // 色调映射（对齐化合物模块）
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

function buildAtoms(scene, atoms) {
  return atoms.map((atom) => {
    // 升级为 MeshPhysicalMaterial（对齐 MoleculeScene）
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(atom.color || DEFAULT_COLOR),
      roughness: 0.28,
      metalness: 0.25,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.15,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(atom.radius || 0.4, 32, 32), material);
    const start = vectorFromArray(atom.start);
    const end = vectorFromArray(atom.end, atom.start);
    mesh.position.copy(start);
    scene.add(mesh);
    return { atom, mesh, start, end, current: start.clone() };
  });
}

function drawBonds(group, atomState, bonds = {}, progress) {
  group.clear();
  const byId = new Map(atomState.map((state) => [state.atom.id, state]));
  const all = [
    ...withPhase(bonds.before || [], progress < 0.55 ? 1 : Math.max(0, 1 - (progress - 0.55) / 0.35), 0xd97757),
    ...withPhase(bonds.after || [], progress > 0.35 ? Math.min(1, (progress - 0.35) / 0.45) : 0, 0x4f9f64),
  ];

  all.forEach(({ bond, opacity, color }) => {
    if (opacity <= 0.05) return;
    const a = byId.get(bond.a);
    const b = byId.get(bond.b);
    if (!a || !b) return;
    // 升级为 MeshPhysicalMaterial + 提升圆柱分段数（12→16）
    const material = new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity,
      roughness: 0.35,
      metalness: 0.4,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.0,
    });
    const order = Number(bond.order || 1);
    for (let i = 0; i < order; i += 1) {
      const mesh = cylinderBetween(a.current.toArray(), b.current.toArray(), 0.04, material, 16);
      mesh.position.x += (i - (order - 1) / 2) * 0.09;
      group.add(mesh);
    }
  });
}

function withPhase(bonds, opacity, color) {
  return bonds.map((bond) => ({ bond, opacity, color }));
}

function renderElementCounts(counts = {}) {
  return Object.entries(counts)
    .map(([el, count]) => `<span class="edulab-chip">${el}: ${count}</span>`)
    .join('');
}

function renderSteps(steps = []) {
  return steps.map((step, idx) => `
    <article class="edulab-step" data-edulab-step="${idx}">
      <strong>${idx + 1}. ${step.title || '步骤'}</strong>
      <div>${step.html || step.content || ''}</div>
    </article>
  `).join('');
}

function renderEnergy(energy) {
  if (!energy) return '';
  return `
    <div class="edulab-energy">
      <span>能量变化</span>
      <strong>${energy.deltaH < 0 ? '放热' : '吸热'}</strong>
    </div>
  `;
}

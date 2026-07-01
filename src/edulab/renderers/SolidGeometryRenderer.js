import * as THREE from 'three';
import { cylinderBetween, makeSceneShell, vectorFromArray } from './threeUtils.js';

export function renderSolidGeometryLesson(root, payload) {
  root.innerHTML = '';
  root.className = 'edulab-view edulab-solid-view';

  const side = document.createElement('section');
  side.className = 'edulab-side-panel';
  const sceneHost = document.createElement('div');
  sceneHost.className = 'edulab-canvas-host';
  root.append(side, sceneHost);

  side.innerHTML = `
    <div class="edulab-kicker">SOLID GEOMETRY</div>
    <h2>${payload.lesson?.title || '立体几何'}</h2>
    <p class="edulab-subtitle">${payload.lesson?.answerLabel || ''} ${payload.lesson?.answerValue || ''}</p>
    <div class="edulab-steps">${renderSteps(payload.steps)}</div>
  `;

  const shell = makeSceneShell(sceneHost, {
    camera: payload.model?.initialCamera || [5, 4, 6],
    background: 0xf7f7fb,
  });
  const points = payload.model?.points || {};
  const pointMeshes = buildPoints(shell.scene, points, payload.model?.spheres || Object.keys(points));
  buildEdges(shell.scene, points, payload.model?.edges || []);
  const toggles = buildElements(shell.scene, points, payload.model?.elements || {});
  const buttons = side.querySelectorAll('[data-edulab-step]');

  function activate(index) {
    const step = payload.steps?.[index] || {};
    const visible = new Set(step.highlight || []);
    Object.entries(toggles).forEach(([name, obj]) => {
      obj.visible = visible.has(name);
    });
    pointMeshes.forEach((mesh) => { mesh.visible = true; });
    buttons.forEach((btn) => btn.classList.toggle('active', Number(btn.dataset.edulabStep) === index));
    if (step.cameraPos) {
      shell.camera.position.set(step.cameraPos.x, step.cameraPos.y, step.cameraPos.z);
      shell.camera.lookAt(vectorFromArray(payload.model?.target));
    }
    shell.render();
  }

  buttons.forEach((btn) => btn.addEventListener('click', () => activate(Number(btn.dataset.edulabStep))));
  activate(0);

  return {
    destroy() {
      shell.destroy();
      root.innerHTML = '';
    },
  };
}

function buildPoints(scene, points, names) {
  return names.map((name) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x324b7d }),
    );
    mesh.position.copy(vectorFromArray(points[name]));
    scene.add(mesh);
    return mesh;
  });
}

function buildEdges(scene, points, edges) {
  const material = new THREE.MeshBasicMaterial({ color: 0x8f99a8 });
  edges.forEach((edge) => {
    if (!points[edge.a] || !points[edge.b]) return;
    scene.add(cylinderBetween(points[edge.a], points[edge.b], edge.dashed ? 0.012 : 0.02, material));
  });
}

function buildElements(scene, points, elements) {
  const toggles = {};
  Object.entries(elements).forEach(([name, el]) => {
    let obj = null;
    if (el.type === 'axes') {
      obj = new THREE.AxesHelper(el.size || 2);
    } else if (el.type === 'line' && points[el.a] && points[el.b]) {
      obj = cylinderBetween(points[el.a], points[el.b], 0.035, new THREE.MeshBasicMaterial({ color: 0xd97757 }));
    } else if (el.type === 'plane') {
      obj = buildPlane(points, el.pts || []);
    } else if (el.type === 'arrow') {
      obj = new THREE.ArrowHelper(
        vectorFromArray(el.dir, [0, 1, 0]).normalize(),
        typeof el.origin === 'string' ? vectorFromArray(points[el.origin]) : vectorFromArray(el.origin),
        el.length || 1,
        0xd24b45,
      );
    } else if (el.type === 'measure' && points[el.a] && points[el.b]) {
      obj = cylinderBetween(points[el.a], points[el.b], 0.05, new THREE.MeshBasicMaterial({ color: 0x4c8c6a }));
    }
    if (!obj) return;
    obj.visible = false;
    scene.add(obj);
    toggles[name] = obj;
  });
  return toggles;
}

function buildPlane(points, names) {
  const vertices = names.map((name) => vectorFromArray(points[name])).filter(Boolean);
  if (vertices.length < 3) return new THREE.Group();
  const shape = new THREE.BufferGeometry().setFromPoints(vertices);
  shape.setIndex(vertices.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3]);
  return new THREE.Mesh(shape, new THREE.MeshBasicMaterial({
    color: 0x79a9d8,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
  }));
}

function renderSteps(steps = []) {
  return steps.map((step, idx) => `
    <button class="edulab-step" data-edulab-step="${idx}">
      <strong>${idx + 1}. ${step.title || '步骤'}</strong>
      <span>${stripTags(step.content || '')}</span>
    </button>
  `).join('');
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

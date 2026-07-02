import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SCENE_BG } from '../../data/theme.js';

export function makeSceneShell(container, options = {}) {
  const width = container.clientWidth || 640;
  const height = container.clientHeight || 420;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(options.background ?? SCENE_BG);

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.fromArray(options.camera || [0, 4, 9]);
  const target = new THREE.Vector3().fromArray(options.target || [0, 0, 0]);
  camera.lookAt(target);

  const renderer = makeRenderer(container, width, height);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));

  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(4, 6, 8);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xcad8ff, 0.35);
  fill.position.set(-5, 2, 3);
  scene.add(fill);

  // 与 MoleculeScene 保持一致的交互模式：允许拖拽旋转/滚轮缩放查看，
  // 而不是像此前那样相机位置写死、画面无法转换视角。
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = options.enablePan ?? false;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.minDistance = options.minDistance ?? 1.5;
  controls.maxDistance = options.maxDistance ?? 30;
  controls.update();

  let rafId = null;
  const render = () => renderer.render(scene, camera);
  const loop = () => {
    rafId = requestAnimationFrame(loop);
    controls.update();
    render();
  };
  loop();

  // 用 ResizeObserver 替代一次性读取容器尺寸 + window resize：
  // 容器尺寸由 CSS 网格/flex 决定，不一定跟随 window resize 变化
  // （例如切换课程列表项时容器宽度不变但左右栏比例变化）。
  // jsdom 测试环境不提供 ResizeObserver，做兼容降级避免单测报错。
  const hasResizeObserver = typeof ResizeObserver !== 'undefined';
  const resizeObserver = hasResizeObserver
    ? new ResizeObserver((entries) => {
      const entry = entries[0];
      const w = entry.contentRect.width || width;
      const h = entry.contentRect.height || height;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      render();
    })
    : null;
  resizeObserver?.observe(container);

  return {
    scene,
    camera,
    controls,
    renderer,
    render,
    setTarget(next) {
      controls.target.copy(vectorFromArray(next));
      controls.update();
    },
    destroy() {
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      controls.dispose();
      renderer.dispose?.();
      renderer.domElement?.remove();
    },
  };
}

function makeRenderer(container, width, height) {
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);
    return renderer;
  } catch {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);
    return {
      domElement: canvas,
      setSize(w, h) {
        canvas.width = w;
        canvas.height = h;
      },
      render() {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#f5f4ed';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#3d3929';
        ctx.font = '14px sans-serif';
        ctx.fillText('3D preview unavailable in this environment', 24, 32);
      },
      dispose() {},
    };
  }
}

export function vectorFromArray(arr, fallback = [0, 0, 0]) {
  const src = Array.isArray(arr) ? arr : fallback;
  return new THREE.Vector3(src[0] || 0, src[1] || 0, src[2] || 0);
}

export function cylinderBetween(a, b, radius, material) {
  const start = vectorFromArray(a);
  const end = vectorFromArray(b);
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length() || 0.001;
  const geometry = new THREE.CylinderGeometry(radius, radius, len, 12);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

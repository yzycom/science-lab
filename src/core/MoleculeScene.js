import * as THREE from 'three';
import anime from 'animejs';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createTextSprite } from '../objects/TextSprite.js';
import { SCENE_BG } from '../data/theme.js';

// CPK 配色，适配浅色背景
const ATOM_COLORS = {
  H:  0xd8d5c8,
  C:  0x3d3929,
  N:  0x3344ff,
  O:  0xff2200,
  S:  0xddaa00,
  Na: 0xab5cf2,
  Cl: 0x18c418,
  F:  0x80d040,
  P:  0xff8000,
  Fe: 0xe06633,
  Ca: 0x30dd00,
};

const ATOM_RADIUS = {
  H: 0.25, C: 0.40, N: 0.38, O: 0.38, S: 0.50,
  Na: 0.45, Cl: 0.45, F: 0.35, P: 0.42, Fe: 0.45, Ca: 0.45,
};

// Claude 浅色主题化学键配色
const BOND_COLORS = {
  1: 0xa8a596,  // 单键：暖灰
  2: 0xd97757,  // 双键：Claude 橙
  3: 0x8264b8,  // 三键：紫
};

const ELECTRON_COLOR_HEX = 0xd97757;

/**
 * 在给定 DOM 容器中创建分子 3D 场景。
 * 返回 { destroy }。
 */
export function createMoleculeScene(container, compound) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_BG);

  // —— 透视相机（初始用 1:1，等容器有真实尺寸再修正） ——
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 1.5, 6);
  camera.lookAt(0, 0, 0);

  // —— 渲染器 ——
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
  });
  renderer.setSize(1, 1, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // canvas 始终填满容器，drawing buffer 跟随容器实际像素
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  // —— 环境贴图（PBR 反射）——
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const envTexture = pmrem.fromScene(envScene, 0.04).texture;
  scene.environment = envTexture;

  // —— 光照（三点布光）——
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

  // —— OrbitControls ——
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.minDistance = 1.8;
  controls.maxDistance = 18;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;

  // 用户交互时暂停自动旋转，松开 4 秒后恢复
  let resumeTimer = null;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    if (resumeTimer) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
    }
  });
  controls.addEventListener('end', () => {
    if (resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      controls.autoRotate = true;
      resumeTimer = null;
    }, 4000);
  });

  // —— 分子根 Group（不再用 anime.js 旋转，由 OrbitControls.autoRotate 控制相机）——
  const moleculeGroup = new THREE.Group();
  scene.add(moleculeGroup);

  const animations = [];

  // —— 构建原子 ——
  const atomMeshes = [];
  compound.atoms.forEach(({ el, pos }) => {
    const colorHex = ATOM_COLORS[el] || 0xaaaaaa;
    const r = ATOM_RADIUS[el] || 0.35;

    const geo = new THREE.SphereGeometry(r, 32, 32);
    const mat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      roughness: 0.28,
      metalness: 0.25,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.userData.radius = r;
    moleculeGroup.add(mesh);
    atomMeshes.push(mesh);

    // 元素符号标签：放在原子球正上方
    const sprite = createTextSprite(el, {
      fontSize: 56,
      color: '#3d3929',
      fontWeight: 'bold',
      canvasW: 192,
      canvasH: 96,
      depthTest: true,
      depthWrite: false,
    });
    sprite.position.set(pos[0], pos[1] + r + 0.28, pos[2]);
    sprite.scale.set(0.6, 0.3, 1);
    moleculeGroup.add(sprite);
  });

  // —— 构建化学键 + 电子对 ——
  compound.bonds.forEach(([aIdx, bIdx, order]) => {
    const aPos = new THREE.Vector3(...compound.atoms[aIdx].pos);
    const bPos = new THREE.Vector3(...compound.atoms[bIdx].pos);
    buildBond(moleculeGroup, aPos, bPos, order, animations);
  });

  // —— 原子入场动画 ——
  atomMeshes.forEach(m => { m.scale.set(0.01, 0.01, 0.01); });
  const enterAnim = anime({
    targets: atomMeshes.map(m => m.scale),
    x: [0.01, 1], y: [0.01, 1], z: [0.01, 1],
    duration: 500,
    delay: anime.stagger(60),
    easing: 'easeOutBack',
  });
  animations.push(enterAnim);

  // —— ResizeObserver：自适应容器，首次有效尺寸后启动渲染 ——
  let rafId = null;
  let started = false;

  const startLoop = () => {
    if (started) return;
    started = true;
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();
  };

  const resizeObserver = new ResizeObserver(entries => {
    const entry = entries[0];
    const cw = entry.contentRect.width;
    const ch = entry.contentRect.height;
    if (cw > 0 && ch > 0) {
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch, false);
      startLoop();
    }
  });
  resizeObserver.observe(container);

  // 兜底：如果容器初始已有尺寸（例如复用 visible 面板），立即启动
  const rect = container.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height, false);
    startLoop();
  }

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      if (resumeTimer) clearTimeout(resumeTimer);
      animations.forEach(a => a.pause());
      resizeObserver.disconnect();
      controls.dispose();
      pmrem.dispose();
      envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
  };
}

// —— 内部：构建化学键 + 电子对 ——

function buildBond(group, aPos, bPos, order, animations) {
  const mid = new THREE.Vector3().addVectors(aPos, bPos).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(bPos, aPos);
  const len = dir.length();
  const normDir = dir.clone().normalize();

  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normDir);

  const bondColor = BOND_COLORS[order] || BOND_COLORS[1];
  const offsets = order === 1 ? [0] : order === 2 ? [-0.07, 0.07] : [-0.1, 0, 0.1];

  // 计算垂直轴
  const up = Math.abs(normDir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const perpA = new THREE.Vector3().crossVectors(normDir, up).normalize();
  const perpB = new THREE.Vector3().crossVectors(normDir, perpA).normalize();

  // 圆柱
  offsets.forEach(off => {
    const geo = new THREE.CylinderGeometry(0.04, 0.04, len * 0.78, 16);
    const mat = new THREE.MeshPhysicalMaterial({
      color: bondColor,
      roughness: 0.35,
      metalness: 0.4,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.0,
      transparent: true,
      opacity: 0.85,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mid);
    mesh.quaternion.copy(quat);
    mesh.position.addScaledVector(perpA, off);
    group.add(mesh);
  });

  // 共用电子对（带辉光）
  const pairOffsets = order === 1 ? [0] : order === 2 ? [-0.12, 0.12] : [-0.16, 0, 0.16];

  pairOffsets.forEach((po, pairIdx) => {
    const speed = 1.5 + pairIdx * 0.4;
    const orbitR = 0.09;
    const durationMs = (Math.PI * 2 / speed) * 1000;

    [0, Math.PI].forEach((phaseOff, ei) => {
      // 主电子球（小一点，发光柔和）
      const geoE = new THREE.SphereGeometry(0.035, 12, 12);
      const matE = new THREE.MeshStandardMaterial({
        color: ELECTRON_COLOR_HEX,
        emissive: ELECTRON_COLOR_HEX,
        emissiveIntensity: 1.2,
        roughness: 0.4,
      });
      const electronMesh = new THREE.Mesh(geoE, matE);
      group.add(electronMesh);

      const base = mid.clone().addScaledVector(perpA, po);

      const proxy = { angle: 0 };
      const anim = anime({
        targets: proxy,
        angle: Math.PI * 2,
        duration: durationMs,
        easing: 'linear',
        loop: true,
        update: () => {
          const a = proxy.angle + phaseOff;
          const x = base.x + perpB.x * orbitR * Math.cos(a) + normDir.x * orbitR * Math.sin(a);
          const y = base.y + perpB.y * orbitR * Math.cos(a) + normDir.y * orbitR * Math.sin(a);
          const z = base.z + perpB.z * orbitR * Math.cos(a) + normDir.z * orbitR * Math.sin(a);
          electronMesh.position.set(x, y, z);
        },
      });
      animations.push(anim);
    });
  });
}

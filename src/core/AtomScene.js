import * as THREE from 'three';
import anime from 'animejs';
import { getShells, SHELL_NAMES } from '../data/shells.js';

const SHELL_COLORS = ['#e07760', '#e0954a', '#5ea05e', '#4e8ec2', '#8264b8', '#c9a83c', '#b060aa'];

/**
 * 在给定 DOM 容器中创建原子结构 3D 场景。
 * 返回一个 { destroy } 对象用于清理。
 */
export function createAtomScene(container, element) {
  const w = container.clientWidth || 348;
  const h = container.clientHeight || 280;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0efe8);

  const shells = getShells(element.z);
  const maxR = 1.0 + (shells.length - 1) * 0.85 + 0.5;
  const zoom = (Math.min(w, h) * 0.9) / (maxR * 2.5);

  const camera = new THREE.OrthographicCamera(
    -w / 2 / zoom, w / 2 / zoom,
    h / 2 / zoom, -h / 2 / zoom,
    0.1, 100
  );
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // 光照
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const pt = new THREE.PointLight(0xffffff, 0.6);
  pt.position.set(0, 0, 15);
  scene.add(pt);

  // 原子核
  buildNucleus(scene, element);

  // 轨道 + 电子
  const orbitAnims = [];
  shells.forEach((electronCount, shellIdx) => {
    const baseRadius = 1.0 + shellIdx * 0.85;
    const shellColor = SHELL_COLORS[shellIdx % SHELL_COLORS.length];
    const displayed = Math.min(electronCount, 12);
    const baseSpeed = 1.8 / (shellIdx + 1); // 弧度/秒

    // 轨道环
    buildOrbitalRing(scene, baseRadius, shellColor);

    // 电子
    const electrons = buildElectrons(scene, displayed, baseRadius);

    // anime.js 循环动画：电子严格锁定在所属壳层的轨道环上（半径固定 = baseRadius），
    // 随机性只体现在环上的角位置和运动节奏，不偏离自己的电子层：
    // - 初始相位：完全随机，电子分散在环的不同角度
    // - 速度：0.5x ~ 1.8x baseSpeed，电子彼此错开、相对漂移
    // - 旋转方向：50% 概率反向
    electrons.forEach((electron) => {
      const phaseOffset = Math.random() * Math.PI * 2;
      const speed = baseSpeed * (0.5 + Math.random() * 1.3);
      const direction = Math.random() < 0.5 ? -1 : 1;
      const durationMs = (Math.PI * 2 / speed) * 1000;

      const proxy = { angle: 0 };
      const anim = anime({
        targets: proxy,
        angle: Math.PI * 2,
        duration: durationMs,
        easing: 'linear',
        loop: true,
        update: () => {
          const a = direction * proxy.angle + phaseOffset;
          electron.position.x = baseRadius * Math.cos(a);
          electron.position.y = baseRadius * Math.sin(a);
        },
      });
      orbitAnims.push(anim);
    });
  });

  // 渲染循环
  let rafId;
  const loop = () => {
    rafId = requestAnimationFrame(loop);
    renderer.render(scene, camera);
  };
  loop();

  // 返回清理函数
  return {
    destroy() {
      cancelAnimationFrame(rafId);
      orbitAnims.forEach(a => a.pause());
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
  };
}

// —— 内部工具 ——

function buildNucleus(scene, element) {
  const protons = element.z;
  const neutrons = Math.max(0, Math.round(element.mass) - protons);
  const total = Math.min(protons + neutrons, 80);
  const pCount = Math.min(protons, Math.round(total * protons / (protons + neutrons)));
  const R = 0.13;
  const packR = R * 2.0 * Math.cbrt(total) / 2;

  const geoCircle = new THREE.CircleGeometry(0.12, 16);
  const matProton = new THREE.MeshStandardMaterial({ color: 0xe07760, emissive: 0xe07760, emissiveIntensity: 0.3 });
  const matNeutron = new THREE.MeshStandardMaterial({ color: 0x8c8a7c, emissive: 0x555555, emissiveIntensity: 0.2 });

  for (let i = 0; i < total; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / total);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const layer = Math.cbrt((i + 1) / total);
    const r = packR * layer;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = 0.01 * r * Math.cos(phi);

    const mesh = new THREE.Mesh(geoCircle, i < pCount ? matProton : matNeutron);
    mesh.position.set(x, y, z);
    scene.add(mesh);
  }
}

function buildOrbitalRing(scene, radius, color) {
  const ringGeo = new THREE.RingGeometry(radius - 0.015, radius + 0.015, 96);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });
  scene.add(new THREE.Mesh(ringGeo, ringMat));
}

function buildElectrons(scene, count, radius) {
  const geoSphere = new THREE.SphereGeometry(0.1, 12, 12);
  const matElectron = new THREE.MeshStandardMaterial({
    color: 0x4e8ec2,
    emissive: 0x4e8ec2,
    emissiveIntensity: 0.8,
  });

  const electrons = [];
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geoSphere, matElectron);
    scene.add(mesh);
    electrons.push(mesh);
  }
  return electrons;
}

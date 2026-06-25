import * as THREE from 'three';
import { createTextSprite } from './TextSprite.js';
import { CATEGORY_COLORS } from '../data/layout.js';
import { ELEMENT_NAMES_ZH } from '../data/elementNamesZh.js';

const BLOCK_W = 1.9;
const BLOCK_H = 1.9;
const BLOCK_D = 0.32;

/**
 * 创建一个元素方块 Group。
 * group.userData.element — 元素数据
 * group.userData.basePosition — 网格基础位置 [x, y, z]
 * group.userData.meshIndex = 0 — 第一个子节点是碰撞体 Mesh
 */
export function createElementBlock(element, position) {
  const color = CATEGORY_COLORS[element.category] || '#8c8a7c';
  const colorHex = parseInt(color.replace('#', '0x'));
  const zhName = ELEMENT_NAMES_ZH[element.symbol] || '';

  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  group.userData.element = element;
  group.userData.basePosition = position.slice();

  // — 主体 —
  const geo = new THREE.BoxGeometry(BLOCK_W, BLOCK_H, BLOCK_D);
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.0,
    metalness: 0.05,
    roughness: 0.65,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.isBlock = true;
  group.add(mesh);          // index 0

  // — 符号（大，居中偏上） —
  const symbolSprite = createTextSprite(element.symbol, {
    fontSize: 72,
    color: '#ffffff',
    fontWeight: 'bold',
    canvasW: 256,
    canvasH: 128,
  });
  symbolSprite.position.set(0, 0.25, BLOCK_D * 0.5 + 0.01);
  symbolSprite.scale.set(1.0, 0.5, 1);
  group.add(symbolSprite);   // index 1

  // — 中文名（符号下方） —
  if (zhName) {
    const zhSprite = createTextSprite(zhName, {
      fontSize: 96,
      color: '#ffffff',
      fontWeight: 'bold',
      canvasW: 256,
      canvasH: 128,
    });
    zhSprite.position.set(0, -0.42, BLOCK_D * 0.5 + 0.01);
    zhSprite.scale.set(1.0, 0.5, 1);
    group.add(zhSprite);     // index 2
  }

  // — 原子序数（左上角） —
  const zSprite = createTextSprite(String(element.z), {
    fontSize: 36,
    color: 'rgba(255,255,255,0.85)',
    canvasW: 128,
    canvasH: 64,
  });
  zSprite.position.set(-0.62, 0.7, BLOCK_D * 0.5 + 0.01);
  zSprite.scale.set(0.5, 0.25, 1);
  group.add(zSprite);

  // — 原子量（右上角） —
  const massSprite = createTextSprite(String(element.mass), {
    fontSize: 26,
    color: 'rgba(255,255,255,0.7)',
    canvasW: 160,
    canvasH: 56,
  });
  massSprite.position.set(0.45, 0.72, BLOCK_D * 0.5 + 0.01);
  massSprite.scale.set(0.7, 0.18, 1);
  group.add(massSprite);

  return group;
}

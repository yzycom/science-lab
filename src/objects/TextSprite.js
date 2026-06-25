import * as THREE from 'three';

/**
 * 用 Canvas 2D 绘制文字并生成 Three.js Sprite。
 * @param {string} text
 * @param {object} opts - { fontSize, color, fontWeight, canvasW, canvasH }
 */
export function createTextSprite(text, opts = {}) {
  const {
    fontSize = 56,
    color = '#ffffff',
    fontWeight = 'normal',
    canvasW = 256,
    canvasH = 128,
    depthTest = false,
    depthWrite = false,
  } = opts;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.font = `${fontWeight} ${fontSize}px -apple-system, Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvasW / 2, canvasH / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest,
    depthWrite,
  });

  const sprite = new THREE.Sprite(material);
  return sprite;
}

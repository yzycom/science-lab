import * as THREE from 'three';

export function makeSceneShell(container, options = {}) {
  const width = container.clientWidth || 640;
  const height = container.clientHeight || 420;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(options.background || 0xf7f7f2);

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.fromArray(options.camera || [0, 4, 9]);
  camera.lookAt(0, 0, 0);

  const renderer = makeRenderer(container, width, height);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));

  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(4, 6, 8);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xcad8ff, 0.35);
  fill.position.set(-5, 2, 3);
  scene.add(fill);

  let rafId = null;
  const render = () => renderer.render(scene, camera);
  const loop = () => {
    rafId = requestAnimationFrame(loop);
    render();
  };
  loop();

  const onResize = () => {
    const w = container.clientWidth || width;
    const h = container.clientHeight || height;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    render();
  };
  window.addEventListener('resize', onResize);

  return {
    scene,
    camera,
    renderer,
    render,
    destroy() {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
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
        ctx.fillStyle = '#f7f7f2';
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

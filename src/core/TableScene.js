import * as THREE from 'three';

/**
 * 周期表主场景：正交相机 + 静态网格
 */
export class TableScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f4ed);

    this.setupCamera();
    this.setupRenderer();
    this.setupLights();
    this.handleResize();

    this.animate();
  }

  setupCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const frustumSize = 28;
    
    this.camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    
    // 俯瞰角度，让周期表居中显示
    this.camera.position.set(18, -10, 30);
    this.camera.lookAt(18, -10, 0);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);
  }

  setupLights() {
    // 浅色场景需要柔和光照
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.4);
    directional.position.set(8, 12, 15);
    this.scene.add(directional);

    // 轻微侧光增加层次
    const rim = new THREE.DirectionalLight(0xfaf9f5, 0.25);
    rim.position.set(-10, -8, 10);
    this.scene.add(rim);
  }

  handleResize() {
    window.addEventListener('resize', () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      const aspect = w / h;
      const frustumSize = 28;

      this.camera.left = -frustumSize * aspect / 2;
      this.camera.right = frustumSize * aspect / 2;
      this.camera.top = frustumSize / 2;
      this.camera.bottom = -frustumSize / 2;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(w, h);
    });
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
  }

  add(obj) {
    this.scene.add(obj);
  }

  remove(obj) {
    this.scene.add(obj);
  }
}

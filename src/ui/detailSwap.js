// 详情面板内容切换的过渡调度。
//
// 背景：切换课程/化合物时，旧场景销毁 + 新场景构建（几何、材质、shader 编译）
// 全部同步跑在 click 回调里，主线程被独占 60~1300ms，用户看到的是"点一下整个页面冻住，
// 然后画面突然换掉"。这里把切换拆成：淡出 140ms → 在不可见状态下构建 → 淡入，
// 让耗时发生在画面已经隐去之后，观感上是连续过渡而不是硬跳。
//
// 用内联 opacity 而不是 class：三个 Edulab 渲染器都会对根节点执行
// `root.className = 'edulab-view ...'`，会抹掉任何 class 形式的过渡状态。

const OUT_MS = 140;

const states = new WeakMap();

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getState(el) {
  let state = states.get(el);
  if (!state) {
    state = { timer: null, token: 0 };
    states.set(el, state);
  }
  return state;
}

/** 取消未完成的切换，并把元素恢复到不透明状态。 */
export function cancelDetailSwap(el) {
  if (!el) return;
  const state = states.get(el);
  if (state) {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    state.token += 1;
  }
  el.style.opacity = '';
}

/**
 * 先淡出再构建，构建完成后淡入。
 * @param {HTMLElement} el 详情容器
 * @param {Function} build 构建新内容（可含重活）
 */
export function swapDetailContent(el, build) {
  if (!el) {
    build();
    return;
  }

  const state = getState(el);
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  const token = ++state.token;

  // 首次填充（容器还是空的）或用户关闭动效时，直接构建，不制造空等。
  if (!el.firstElementChild || prefersReducedMotion()) {
    el.style.opacity = '';
    build();
    return;
  }

  el.style.opacity = '0';

  state.timer = setTimeout(() => {
    state.timer = null;
    if (state.token !== token) return;

    const fadeIn = () => {
      // 两帧之后再淡入，保证新内容已经按 opacity:0 绘制过一帧，
      // 否则第一帧会直接以不透明状态出现，等于没有过渡。
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (state.token !== token) return;
        el.style.opacity = '1';
      }));
    };

    // build 允许返回 Promise（例如 3D 场景要等两帧拿到容器尺寸后才创建），
    // 有 Promise 就以它为准，避免画布还没首帧就淡入。
    const pending = build();
    if (pending && typeof pending.then === 'function') {
      pending.then(fadeIn, fadeIn);
    } else {
      fadeIn();
    }
  }, OUT_MS);
}

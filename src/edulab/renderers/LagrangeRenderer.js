import { LAGRANGE_PALETTE } from '../../data/theme.js';
import { renderLatex } from './katexUtils.js';
import { earthHeliocentricLongitude, lagrangeSnapshot, AU_KM } from '../lagrange.js';

// 每个点的教学注释。stable = 是否在共线/三角点里属于稳定平衡。
const POINT_META = {
  L1: { role: '日地之间的天平点', usage: '太阳观测站常驻地（SOHO、SDO）', stable: false },
  L2: { role: '地球背阳侧天平点', usage: '深空望远镜常驻地（JWST、嫦娥四号中继星）', stable: false },
  L3: { role: '太阳背后的对称点', usage: '被太阳遮挡，无实用价值', stable: false },
  L4: { role: '等边三角形顶点（前 60°）', usage: '特洛伊型小天体聚集区', stable: true },
  L5: { role: '等边三角形顶点（后 60°）', usage: '与 L4 对称的引力陷阱，同样稳定', stable: true },
};

const RAD = Math.PI / 180;
const INSET_WINDOW_AU = 0.022; // 放大镜半视野，覆盖 L1/L2 的 ±0.0101 AU

const canAnimate = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';
const schedule = canAnimate ? (cb) => window.requestAnimationFrame(cb) : () => null;
const cancelSchedule = canAnimate ? (id) => window.cancelAnimationFrame(id) : null;

export function renderLagrangeLesson(root, payload) {
  root.innerHTML = '';
  root.className = 'edulab-view edulab-lagrange-view';

  const side = document.createElement('section');
  side.className = 'edulab-side-panel';
  const boardHost = document.createElement('div');
  boardHost.className = 'edulab-canvas-host';
  const canvas = document.createElement('canvas');
  boardHost.appendChild(canvas);
  root.append(side, boardHost);

  side.innerHTML = `
    <div class="edulab-kicker">ORBITAL MECHANICS</div>
    <h2>${payload.lesson?.title || '太阳—地球拉格朗日点'}</h2>
    <div class="edulab-subtitle">${payload.lesson?.problem || ''}</div>
    <div class="lagrange-timebar">
      <button type="button" data-lagrange-mode="live" class="active">实时</button>
      <button type="button" data-lagrange-mode="day">1 天/秒</button>
      <button type="button" data-lagrange-mode="fast">10 天/秒</button>
      <span class="lagrange-clock" data-lagrange-clock>—</span>
    </div>
    <label class="lagrange-exaggerate">
      <span>示意放大 L1/L2 偏移 <b data-lagrange-scale>×1</b>（非真实比例）</span>
      <input type="range" min="1" max="40" step="1" value="1" data-lagrange-exaggerate />
    </label>
    <div class="edulab-readouts lagrange-readouts"></div>
    <div class="edulab-steps">${renderSteps(payload.steps)}</div>
  `;

  const clock = side.querySelector('[data-lagrange-clock]');
  const readouts = side.querySelector('.lagrange-readouts');
  const scaleLabel = side.querySelector('[data-lagrange-scale]');
  const slider = side.querySelector('[data-lagrange-exaggerate]');
  const modeButtons = [...side.querySelectorAll('[data-lagrange-mode]')];

  const state = {
    mode: 'live',
    thetaDeg: earthHeliocentricLongitude(new Date()) / RAD,
    exaggerate: 1,
    simulatedMs: Date.now(),
    lastTs: 0,
  };

  let rafId = null;
  let lastReadoutKey = '';
  let destroyed = false;

  function frame(ts) {
    if (destroyed) return;
    const dt = state.lastTs ? Math.min((ts - state.lastTs) / 1000, 0.25) : 0;
    state.lastTs = ts;

    if (state.mode === 'live') {
      state.thetaDeg = earthHeliocentricLongitude(new Date()) / RAD;
      state.simulatedMs = Date.now();
    } else {
      const daysPerSecond = state.mode === 'day' ? 1 : 10;
      state.simulatedMs += dt * daysPerSecond * 86400000;
      state.thetaDeg = (state.thetaDeg + (dt * daysPerSecond * 360) / 365.2422) % 360;
    }

    draw();

    const key = state.mode + '|' + Math.round(state.thetaDeg) + '|' + state.exaggerate;
    if (key !== lastReadoutKey) {
      lastReadoutKey = key;
      updateReadouts();
    }
    rafId = schedule(frame);
  }

  function draw() {
    const rect = boardHost.getBoundingClientRect();
    const width = Math.max(560, Math.round(rect.width || 560));
    const height = Math.max(400, Math.round(rect.height || 400));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const ctx = canvas.getContext('2d') || makeNullContext();
    const snapshot = lagrangeSnapshot(state.thetaDeg, { exaggerate: state.exaggerate });
    drawScene(ctx, width, height, snapshot, state);
    clock.textContent = formatClock(state);
  }

  function updateReadouts() {
    const snapshot = lagrangeSnapshot(state.thetaDeg, { exaggerate: state.exaggerate });
    readouts.innerHTML = ['L1', 'L2', 'L3', 'L4', 'L5'].map((id) => {
      const point = snapshot.points[id];
      const meta = POINT_META[id];
      return `
        <div class="lagrange-card" data-point="${id}">
          <span class="lagrange-dot" style="background:${LAGRANGE_PALETTE[id]}"></span>
          <b>${id}</b>
          <span class="lagrange-card-role">${meta.role}</span>
          <span class="lagrange-card-num">距日 ${point.sunAU.toFixed(6)} AU · 距地 ${formatKm(point.earthKm)}</span>
          <span class="lagrange-card-tag ${meta.stable ? 'stable' : ''}">${meta.stable ? '稳定' : '不稳定'}</span>
          <span class="lagrange-card-use">${meta.usage}</span>
        </div>
      `;
    }).join('');
  }

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.mode = button.dataset.lagrangeMode;
      state.lastTs = 0;
      if (state.mode !== 'live') {
        state.thetaDeg = earthHeliocentricLongitude(new Date()) / RAD;
        state.simulatedMs = Date.now();
      }
      modeButtons.forEach((other) => other.classList.toggle('active', other === button));
      lastReadoutKey = '';
    });
  });

  slider?.addEventListener('input', () => {
    state.exaggerate = Number(slider.value);
    scaleLabel.textContent = '×' + state.exaggerate;
    draw();
  });

  const onResize = () => draw();
  window.addEventListener('resize', onResize);

  draw();
  updateReadouts();
  renderLatex(side);
  rafId = schedule(frame);

  return {
    destroy() {
      destroyed = true;
      if (rafId !== null && cancelSchedule) cancelSchedule(rafId);
      window.removeEventListener('resize', onResize);
      root.innerHTML = '';
    },
  };
}

function drawScene(ctx, w, h, snapshot, state) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = LAGRANGE_PALETTE.canvasBg;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.52;
  const cy = h * 0.46;
  const radius = Math.min(w, h) * 0.34;
  const theta = snapshot.thetaDeg * RAD;

  // 30° 辐条，给平面一点纵深
  ctx.strokeStyle = LAGRANGE_PALETTE.spoke;
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i += 1) {
    const a = i * 30 * RAD;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * radius * 0.12, cy - Math.sin(a) * radius * 0.12);
    ctx.lineTo(cx + Math.cos(a) * radius, cy - Math.sin(a) * radius);
    ctx.stroke();
  }

  // 地球轨道
  ctx.strokeStyle = LAGRANGE_PALETTE.orbit;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 日地连线
  const ex = cx + Math.cos(theta) * radius;
  const ey = cy - Math.sin(theta) * radius;
  ctx.save();
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = LAGRANGE_PALETTE.link;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.restore();

  // 太阳
  ctx.fillStyle = LAGRANGE_PALETTE.sun;
  ctx.beginPath();
  ctx.arc(cx, cy, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = LAGRANGE_PALETTE.label;
  ctx.font = '13px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('太阳', cx + 15, cy + 4);

  // 五个拉格朗日点（L4/L5 先画，避免压住 L1/L2）
  ['L4', 'L5', 'L3', 'L1', 'L2'].forEach((id) => {
    const point = snapshot.points[id];
    const px = cx + point.display[0] * radius;
    const py = cy - point.display[1] * radius;
    // 真实比例下 L1/L2 与地球像素级重合，主图不挂标签，交给放大镜
    const showLabel = !(state.exaggerate === 1 && (id === 'L1' || id === 'L2'));
    drawPoint(ctx, px, py, LAGRANGE_PALETTE[id], id, id === 'L4' || id === 'L5', showLabel);
  });

  // 地球
  ctx.fillStyle = LAGRANGE_PALETTE.earth;
  ctx.beginPath();
  ctx.arc(ex, ey, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = LAGRANGE_PALETTE.label;
  ctx.fillText('地球', ex + 10, ey - 10);

  // 从地球指向放大镜的引线，说明左下角那块是哪里放大的
  const inset = insetRect(w, h);
  ctx.save();
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = LAGRANGE_PALETTE.link;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(inset.x0 + inset.size, inset.y0 + 8);
  ctx.stroke();
  ctx.restore();

  drawInset(ctx, inset, snapshot);
}

function insetRect(w, h) {
  const size = Math.min(196, Math.round(Math.min(w, h) * 0.34));
  return { size, x0: 20, y0: h - size - 20 };
}

function drawPoint(ctx, x, y, color, label, emphasize, showLabel = true) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, emphasize ? 5 : 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = LAGRANGE_PALETTE.canvasBg;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (!showLabel) return;
  ctx.fillStyle = LAGRANGE_PALETTE.label;
  ctx.font = emphasize ? 'bold 13px "PingFang SC", sans-serif' : '12px "PingFang SC", sans-serif';
  ctx.fillText(label, x + 8, y - 7);
}

function drawInset(ctx, inset, snapshot) {
  const { size, x0, y0 } = inset;
  const cx = x0 + size / 2;
  const cy = y0 + size / 2;
  const scale = size / 2 / INSET_WINDOW_AU;

  ctx.save();
  ctx.fillStyle = LAGRANGE_PALETTE.insetBg;
  ctx.fillRect(x0, y0, size, size);
  ctx.strokeStyle = LAGRANGE_PALETTE.insetBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(x0, y0, size, size);

  // 放大镜内部用旋转坐标系：横轴是日地连线，太阳在左
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = LAGRANGE_PALETTE.link;
  ctx.beginPath();
  ctx.moveTo(x0 + 8, cy);
  ctx.lineTo(x0 + size - 8, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  const gamma1 = 1 - snapshot.points.L1.exact[0];
  const gamma2 = snapshot.points.L2.exact[0] - 1;

  ctx.fillStyle = LAGRANGE_PALETTE.L1;
  ctx.beginPath();
  ctx.arc(cx - gamma1 * scale, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = LAGRANGE_PALETTE.L2;
  ctx.beginPath();
  ctx.arc(cx + gamma2 * scale, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = LAGRANGE_PALETTE.earth;
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = LAGRANGE_PALETTE.label;
  ctx.font = '11px "PingFang SC", sans-serif';
  ctx.fillText('L1', cx - gamma1 * scale - 18, cy - 9);
  ctx.fillText('L2', cx + gamma2 * scale + 5, cy - 9);
  ctx.fillText('地球', cx + 8, cy + 17);
  ctx.font = '10px "PingFang SC", sans-serif';
  ctx.fillStyle = LAGRANGE_PALETTE.labelSoft;
  ctx.fillText('← 太阳方向 · 局部放大', x0 + 8, y0 + 14);
  ctx.fillText('半视野 ' + INSET_WINDOW_AU.toFixed(3) + ' AU', x0 + 8, y0 + size - 8);
  ctx.restore();
}

function renderSteps(steps = []) {
  return steps.map((step, index) => `
    <article class="edulab-step" data-edulab-step="${index}">
      <strong>${index + 1}. ${step.title || '步骤'}</strong>
      <div>${step.content || ''}</div>
    </article>
  `).join('');
}

function formatKm(km) {
  if (km >= 1e8) return (km / AU_KM).toFixed(4) + ' AU';
  if (km >= 1e4) return (km / 1e4).toFixed(1) + ' 万 km';
  return Math.round(km) + ' km';
}

function formatClock(state) {
  const date = state.mode === 'live' ? new Date() : new Date(state.simulatedMs);
  const text = date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const angle = ((state.thetaDeg % 360) + 360) % 360;
  return text + ' · 黄经 ' + angle.toFixed(1) + '°';
}

function makeNullContext() {
  const noop = () => {};
  return {
    clearRect: noop,
    fillRect: noop,
    strokeRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    setLineDash: noop,
    fillText: noop,
    measureText: () => ({ width: 0 }),
    set fillStyle(_) {},
    set strokeStyle(_) {},
    set lineWidth(_) {},
    set font(_) {},
  };
}

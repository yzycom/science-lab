import { ANALYTIC_PALETTE } from '../../data/theme.js';
import { renderLatex } from './katexUtils.js';
import { solveDerived, computeReadout } from './geometryEngine.js';

export function renderAnalyticGeometryLesson(root, payload) {
  root.innerHTML = '';
  root.className = 'edulab-view edulab-analytic-view';

  const side = document.createElement('section');
  side.className = 'edulab-side-panel';
  const boardHost = document.createElement('div');
  boardHost.className = 'edulab-canvas-host';
  const canvas = document.createElement('canvas');
  boardHost.appendChild(canvas);
  // rangeBar/answerBand 的 label 可能含 $...$ LaTeX 语法，KaTeX 只能渲染 DOM 文本，
  // 无法处理 canvas.fillText() 画上去的像素文字，所以用独立的 DOM 层叠加在画布上。
  const rangeLabel = document.createElement('div');
  rangeLabel.className = 'edulab-canvas-range-label';
  boardHost.appendChild(rangeLabel);
  root.append(side, boardHost);


  side.innerHTML = `
    <div class="edulab-kicker">ANALYTIC GEOMETRY</div>
    <h2>${payload.lesson?.title || '解析几何'}</h2>
    <div class="edulab-subtitle">${payload.lesson?.problem || ''}</div>
    ${renderParam(payload.board?.param)}
    <div class="edulab-readouts"></div>
    <div class="edulab-steps">${renderSteps(payload.steps)}</div>
  `;

  const param = side.querySelector('[data-edulab-param]');
  const readouts = side.querySelector('.edulab-readouts');
  const state = { value: Number(payload.board?.param?.value || 0) };

  function draw() {
    const rect = boardHost.getBoundingClientRect();
    canvas.width = Math.max(640, rect.width || 640);
    canvas.height = Math.max(420, rect.height || 420);
    const ctx = canvas.getContext('2d') || makeNullContext();
    const solved = solveDerived(payload.board || {}, state.value);
    drawBoardWithSolved(ctx, canvas, payload.board || {}, state.value, solved);
    readouts.innerHTML = renderReadouts(payload.board || {}, state.value, solved);
    renderLatex(readouts);
    updateRangeLabel(rangeLabel, canvas, payload.board || {}, state.value, solved);
    renderLatex(rangeLabel);
  }

  param?.addEventListener('input', () => {
    state.value = Number(param.value);
    draw();
  });
  window.addEventListener('resize', draw);
  draw();

  // lesson.problem / param.label / step.content / readout.label / rangeBar.label 等字符串
  // 均可能包含 $...$ / $$...$$ LaTeX 语法，之前只做了 innerHTML 插入未做渲染，
  // 导致页面直接显示公式源码。现在补上 KaTeX 后处理。
  renderLatex(side);

  return {
    destroy() {
      window.removeEventListener('resize', draw);
      root.innerHTML = '';
    },
  };
}

function drawBoardWithSolved(ctx, canvas, board, paramValue, solved) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f5f4ed';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const view = board.view || { xRange: [-5, 5], yRange: [-3, 3] };
  const map = createMapper(canvas, view);
  
  drawGrid(ctx, canvas, map, view);
  (board.conics || []).forEach((conic) => drawConic(ctx, map, conic, paramValue));
  
  // 绘制所有点（固定点 + derived 生成的点）
  Object.entries(solved).forEach(([name, obj]) => {
    if (obj.type === 'point') {
      drawPointObj(ctx, map, obj);
    }
  });
  
  // 绘制 derived 元素（直线/线段/向量/多边形）
  Object.values(solved).forEach((obj) => {
    if (obj.type === 'line') {
      drawLine(ctx, map, obj, view);
    } else if (obj.type === 'segment') {
      drawSegment(ctx, map, obj);
    } else if (obj.type === 'vector') {
      drawVector(ctx, map, obj);
    } else if (obj.type === 'polygon') {
      drawPolygon(ctx, map, obj);
    }
  });
  
  drawRange(ctx, canvas, board, paramValue, solved);
}

function makeNullContext() {
  return {
    clearRect() {},
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    arc() {},
    fill() {},
    fillText() {},
    set fillStyle(_) {},
    set strokeStyle(_) {},
    set lineWidth(_) {},
    set font(_) {},
  };
}

function createMapper(canvas, view) {
  const [x0, x1] = view.xRange || [-5, 5];
  const [y0, y1] = view.yRange || [-3, 3];
  const sx = canvas.width / (x1 - x0);
  const sy = canvas.height / (y1 - y0);
  return {
    xy(x, y) {
      return [(x - x0) * sx, canvas.height - (y - y0) * sy];
    },
  };
}

function drawGrid(ctx, canvas, map, view) {
  ctx.strokeStyle = '#e2e2d8';
  ctx.lineWidth = 1;
  for (let x = Math.ceil(view.xRange[0]); x <= view.xRange[1]; x += 1) {
    const [sx] = map.xy(x, 0);
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, canvas.height); ctx.stroke();
  }
  for (let y = Math.ceil(view.yRange[0]); y <= view.yRange[1]; y += 1) {
    const [, sy] = map.xy(0, y);
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(canvas.width, sy); ctx.stroke();
  }
  ctx.strokeStyle = '#9aa19a';
  const [xAxis] = map.xy(0, 0);
  const [, yAxis] = map.xy(0, 0);
  ctx.beginPath(); ctx.moveTo(xAxis, 0); ctx.lineTo(xAxis, canvas.height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, yAxis); ctx.lineTo(canvas.width, yAxis); ctx.stroke();
}

function drawConic(ctx, map, conic, paramValue) {
  ctx.strokeStyle = color(conic.color, ANALYTIC_PALETTE.curve);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const a = evalNumber(conic.a, paramValue, 2);
  const b = evalNumber(conic.b, paramValue, 1);
  const center = Array.isArray(conic.center) ? conic.center : [0, 0];
  for (let i = 0; i <= 240; i += 1) {
    const t = (Math.PI * 2 * i) / 240;
    let x = center[0];
    let y = center[1];
    if (conic.kind === 'ellipse' || conic.kind === 'circle') {
      x += (conic.kind === 'circle' ? evalNumber(conic.r, paramValue, 1) : a) * Math.cos(t);
      y += (conic.kind === 'circle' ? evalNumber(conic.r, paramValue, 1) : b) * Math.sin(t);
    } else if (conic.kind === 'hyperbola') {
      const u = -2.1 + (4.2 * i) / 240;
      x += a * Math.cosh(u) * (i < 120 ? -1 : 1);
      y += b * Math.sinh(u);
    } else if (conic.kind === 'parabola') {
      const u = -4 + (8 * i) / 240;
      const p = evalNumber(conic.p, paramValue, 1);
      x += (u * u) / (2 * p);
      y += u;
    }
    const [sx, sy] = map.xy(x, y);
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  }
  ctx.stroke();
}

function drawPointObj(ctx, map, obj) {
  if (!Number.isFinite(obj.x) || !Number.isFinite(obj.y)) return;
  const [sx, sy] = map.xy(obj.x, obj.y);
  ctx.fillStyle = color(obj.color, ANALYTIC_PALETTE.point);
  ctx.beginPath();
  ctx.arc(sx, sy, obj.emphasis ? 6 : 4, 0, Math.PI * 2);
  ctx.fill();
  if (obj.label) {
    ctx.fillStyle = '#3d3929';
    ctx.font = '12px sans-serif';
    ctx.fillText(obj.label, sx + 7, sy - 7);
  }
}

function drawLine(ctx, map, obj, view) {
  const { x0, y0, slope } = obj;
  const [xMin, xMax] = view.xRange;
  const [yMin, yMax] = view.yRange;
  
  ctx.strokeStyle = color(obj.color, ANALYTIC_PALETTE.line);
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  if (!Number.isFinite(slope)) {
    // 竖直线
    const [sx] = map.xy(x0, 0);
    const [, sy1] = map.xy(0, yMin);
    const [, sy2] = map.xy(0, yMax);
    ctx.moveTo(sx, sy1);
    ctx.lineTo(sx, sy2);
  } else {
    // y = kx + c
    const c = y0 - slope * x0;
    const y1 = slope * xMin + c;
    const y2 = slope * xMax + c;
    const [sx1, sy1] = map.xy(xMin, y1);
    const [sx2, sy2] = map.xy(xMax, y2);
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
  }
  ctx.stroke();
}

function drawSegment(ctx, map, obj) {
  const { a, b } = obj;
  const [sx1, sy1] = map.xy(a.x, a.y);
  const [sx2, sy2] = map.xy(b.x, b.y);
  
  ctx.strokeStyle = color(obj.color, ANALYTIC_PALETTE.line2);
  ctx.lineWidth = obj.dashed ? 1.5 : 2;
  if (obj.dashed) ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(sx1, sy1);
  ctx.lineTo(sx2, sy2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawVector(ctx, map, obj) {
  const { from, to } = obj;
  const [sx1, sy1] = map.xy(from.x, from.y);
  const [sx2, sy2] = map.xy(to.x, to.y);
  
  ctx.strokeStyle = color(obj.color, ANALYTIC_PALETTE.vecA);
  ctx.fillStyle = color(obj.color, ANALYTIC_PALETTE.vecA);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx1, sy1);
  ctx.lineTo(sx2, sy2);
  ctx.stroke();
  
  // 箭头
  const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
  const headLen = 10;
  ctx.beginPath();
  ctx.moveTo(sx2, sy2);
  ctx.lineTo(sx2 - headLen * Math.cos(angle - Math.PI / 6), sy2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(sx2 - headLen * Math.cos(angle + Math.PI / 6), sy2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawPolygon(ctx, map, obj) {
  const { pts } = obj;
  if (pts.length < 3) return;
  
  ctx.fillStyle = color(obj.color, ANALYTIC_PALETTE.area);
  ctx.strokeStyle = color(obj.stroke, ANALYTIC_PALETTE.line2);
  ctx.lineWidth = 1.5;
  
  ctx.beginPath();
  pts.forEach((pt, i) => {
    const [sx, sy] = map.xy(pt.x, pt.y);
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawRange(ctx, canvas, board, paramValue, solved) {
  const range = board.rangeBar || board.answerBand;
  if (!range) return;
  
  const x = 36;
  const y = canvas.height - 34;
  const w = canvas.width - 72;
  const min = Number(range.min);
  const max = Number(range.max);
  
  // 修正：从 readout 计算值获取进度，而非用滑块原始值
  let currentValue = paramValue;
  if (range.of) {
    const readout = (board.readouts || []).find((r) => r.id === range.of);
    if (readout) {
      const computed = computeReadout(readout, solved, board, paramValue);
      if (typeof computed === 'number') {
        currentValue = computed;
      }
    }
  }
  
  const ratio = Math.max(0, Math.min(1, (currentValue - min) / (max - min || 1)));
  ctx.fillStyle = '#e8e6dc';
  ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = ANALYTIC_PALETTE.curve;
  ctx.fillRect(x, y, w * ratio, 8);
  // range.label 可能含 LaTeX 语法，改由 updateRangeLabel() 用 DOM 元素叠加显示，
  // 这里不再用 ctx.fillText() 把源码画成像素文字。
}

function updateRangeLabel(labelEl, canvas, board, paramValue, solved) {
  const range = board.rangeBar || board.answerBand;
  if (!range) {
    labelEl.style.display = 'none';
    labelEl.textContent = '';
    return;
  }
  labelEl.style.display = 'block';
  labelEl.textContent = range.label || '';
  const x = 36;
  const y = canvas.height - 34;
  const scaleX = canvas.clientWidth ? canvas.clientWidth / canvas.width : 1;
  const scaleY = canvas.clientHeight ? canvas.clientHeight / canvas.height : 1;
  labelEl.style.left = `${x * scaleX}px`;
  labelEl.style.top = `${(y - 22) * scaleY}px`;
}

function renderParam(param) {
  if (!param) return '';
  return `
    <label class="edulab-slider-label">${param.label || param.name}
      <input data-edulab-param type="range" min="${param.min}" max="${param.max}" step="${param.step || 1}" value="${param.value}">
    </label>
  `;
}

function renderReadouts(board, paramValue, solved) {
  return (board.readouts || []).map((readout) => {
    const raw = computeReadout(readout, solved, board, paramValue);
    const text = formatReadoutValue(readout, raw);
    const cls = readout.highlight ? 'edulab-chip edulab-chip-highlight' : 'edulab-chip';
    return `<span class="${cls}">${readout.label}: ${text}</span>`;
  }).join('') + renderConstant(board.constant, solved, board, paramValue);
}

function formatReadoutValue(readout, raw) {
  if (raw === null || raw === undefined) return '—';
  if (readout.type === 'status') return raw;
  if (readout.type === 'coord' && raw && typeof raw === 'object') {
    return `(${raw.x.toFixed(readout.digits ?? 2)}, ${raw.y.toFixed(readout.digits ?? 2)})`;
  }
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return '∞';
    return raw.toFixed(readout.digits ?? 2);
  }
  return String(raw);
}

function renderConstant(constant, solved, board, paramValue) {
  if (!constant) return '';
  const readout = (board.readouts || []).find((r) => r.id === constant.of);
  if (!readout) return '';
  const raw = computeReadout(readout, solved, board, paramValue);
  const text = formatReadoutValue(readout, raw);
  return `<div class="edulab-constant-note">当前计算值：${text}　理论定值：${constant.label || ''}</div>`;
}

function renderSteps(steps = []) {
  return steps.map((step, idx) => `
    <article class="edulab-step">
      <strong>${idx + 1}. ${step.title || '步骤'}</strong>
      <div>${step.content || ''}</div>
    </article>
  `).join('');
}

function evalNumber(value, paramValue, fallback) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return fallback;
  try {
    const fn = new Function('p', 'theta', 'e', 'sqrt', 'sin', 'cos', 'abs', 'pow', 'PI', `return ${value.replaceAll('^', '**')};`);
    const result = fn(paramValue, paramValue, paramValue, Math.sqrt, Math.sin, Math.cos, Math.abs, Math.pow, Math.PI);
    return Number.isFinite(result) ? result : fallback;
  } catch {
    return fallback;
  }
}

function color(name, fallback) {
  return ANALYTIC_PALETTE[name] || name || fallback;
}

export function renderAnalyticGeometryLesson(root, payload) {
  root.innerHTML = '';
  root.className = 'edulab-view edulab-analytic-view';

  const side = document.createElement('section');
  side.className = 'edulab-side-panel';
  const boardHost = document.createElement('div');
  boardHost.className = 'edulab-canvas-host';
  const canvas = document.createElement('canvas');
  boardHost.appendChild(canvas);
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
    drawBoard(ctx, canvas, payload.board || {}, state.value);
    readouts.innerHTML = renderReadouts(payload.board || {}, state.value);
  }

  param?.addEventListener('input', () => {
    state.value = Number(param.value);
    draw();
  });
  window.addEventListener('resize', draw);
  draw();

  return {
    destroy() {
      window.removeEventListener('resize', draw);
      root.innerHTML = '';
    },
  };
}

function drawBoard(ctx, canvas, board, paramValue) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fbfbf7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const view = board.view || { xRange: [-5, 5], yRange: [-3, 3] };
  const map = createMapper(canvas, view);
  drawGrid(ctx, canvas, map, view);
  (board.conics || []).forEach((conic) => drawConic(ctx, map, conic, paramValue));
  Object.entries(board.points || {}).forEach(([name, point]) => drawPoint(ctx, map, name, point, paramValue));
  drawRange(ctx, canvas, board, paramValue);
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
  ctx.strokeStyle = color(conic.color, '#d97757');
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

function drawPoint(ctx, map, name, point, paramValue) {
  const xy = Array.isArray(point) ? point : point.xy;
  if (!xy) return;
  const x = evalNumber(xy[0], paramValue, 0);
  const y = evalNumber(xy[1], paramValue, 0);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const [sx, sy] = map.xy(x, y);
  ctx.fillStyle = color(point.color, '#334155');
  ctx.beginPath(); ctx.arc(sx, sy, point.emphasis ? 6 : 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3d3929';
  ctx.font = '12px sans-serif';
  ctx.fillText(point.label || name, sx + 7, sy - 7);
}

function drawRange(ctx, canvas, board, paramValue) {
  const range = board.rangeBar || board.answerBand;
  if (!range) return;
  const x = 36;
  const y = canvas.height - 34;
  const w = canvas.width - 72;
  const min = Number(range.min);
  const max = Number(range.max);
  const ratio = Math.max(0, Math.min(1, (paramValue - min) / (max - min || 1)));
  ctx.fillStyle = '#e8e6dc';
  ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = '#d97757';
  ctx.fillRect(x, y, w * ratio, 8);
  ctx.fillStyle = '#3d3929';
  ctx.font = '12px sans-serif';
  ctx.fillText(range.label || '', x, y - 8);
}

function renderParam(param) {
  if (!param) return '';
  return `
    <label class="edulab-slider-label">${param.label || param.name}
      <input data-edulab-param type="range" min="${param.min}" max="${param.max}" step="${param.step || 1}" value="${param.value}">
    </label>
  `;
}

function renderReadouts(board, paramValue) {
  return (board.readouts || []).map((readout) => {
    const value = readout.type === 'expr' ? evalNumber(readout.expr, paramValue, paramValue).toFixed(readout.digits ?? 2) : '动态量';
    return `<span class="edulab-chip">${readout.label}: ${value}</span>`;
  }).join('');
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
  const colors = {
    curve: '#d97757',
    curve2: '#8264b8',
    line: '#2f8f9d',
    point: '#334155',
    fixed: '#2f8f64',
    locus: '#c96377',
  };
  return colors[name] || name || fallback;
}

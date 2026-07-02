/**
 * 解析几何动画引擎
 * 
 * 实现 derived 元素的几何求解，包括：
 * - 直线（line_through_angle / line_through_points）
 * - 交点（intersect_line_conic / intersect_line_line）
 * - 向量（vector）
 * - 线段（segment）
 * - 多边形（polygon）
 * - 曲线上的点（point_on_conic）
 * - 点反射（point_reflect）
 * 
 * 以及 readouts 的计算：
 * - coord / slope / length / distance / area_triangle / dot / slope_product / status / distance_point_line
 */

/**
 * 求解 derived 元素，返回几何对象表。
 * @param {Object} board - 包含 conics/points/param/derived 的面板数据
 * @param {number} paramValue - 当前参数值
 * @returns {Object} 几何对象映射表 { name: { type, ...data } }
 */
export function solveDerived(board, paramValue) {
  const solved = {};
  
  // 先复制固定点
  Object.entries(board.points || {}).forEach(([name, point]) => {
    const xy = Array.isArray(point) ? point : point.xy;
    if (!xy) return;
    solved[name] = {
      type: 'point',
      x: evalNumber(xy[0], paramValue, 0),
      y: evalNumber(xy[1], paramValue, 0),
      color: point.color,
      label: point.label || name,
      emphasis: point.emphasis,
    };
  });

  // 按顺序求解 derived
  (board.derived || []).forEach((item) => {
    try {
      const result = solveOne(item, solved, board, paramValue);
      if (result) {
        if (Array.isArray(item.name)) {
          item.name.forEach((n, i) => { solved[n] = result[i]; });
        } else {
          solved[item.name] = result;
        }
      }
    } catch (err) {
      console.warn(`Failed to solve derived ${item.name}:`, err);
    }
  });

  return solved;
}

function solveOne(item, solved, board, paramValue) {
  switch (item.type) {
    case 'line_through_angle': {
      const pt = solved[item.point];
      if (!pt) return null;
      let angle = item.angle === '@param' ? paramValue : evalNumber(item.angle, paramValue, 0);
      if (board.param?.unit === '°') angle = (angle * Math.PI) / 180;
      const slope = angle === Math.PI / 2 ? Infinity : Math.tan(angle);
      return { type: 'line', x0: pt.x, y0: pt.y, slope, color: item.color };
    }

    case 'line_through_points': {
      const a = solved[item.a];
      const b = solved[item.b];
      if (!a || !b) return null;
      const slope = b.x === a.x ? Infinity : (b.y - a.y) / (b.x - a.x);
      return { type: 'line', x0: a.x, y0: a.y, slope, color: item.color };
    }

    case 'intersect_line_conic': {
      const line = solved[item.line];
      const conic = (board.conics || []).find((c) => c.name === item.conic);
      if (!line || !conic) return null;
      const pts = intersectLineConic(line, conic, paramValue);
      return pts.map((p, i) => ({
        type: 'point',
        x: p.x,
        y: p.y,
        color: item.colors?.[i] || item.color,
        label: Array.isArray(item.name) ? item.name[i] : `${item.name}${i}`,
        emphasis: true,
      }));
    }

    case 'vector': {
      const from = solved[item.from];
      const to = solved[item.to];
      if (!from || !to) return null;
      return { type: 'vector', from, to, color: item.color };
    }

    case 'segment': {
      const a = solved[item.a];
      const b = solved[item.b];
      if (!a || !b) return null;
      return { type: 'segment', a, b, color: item.color, dashed: item.dashed };
    }

    case 'polygon': {
      const pts = (item.pts || []).map((name) => solved[name]).filter(Boolean);
      if (pts.length < 3) return null;
      return { type: 'polygon', pts, color: item.color, stroke: item.stroke };
    }

    case 'point_on_conic': {
      const conic = (board.conics || []).find((c) => c.name === item.conic);
      if (!conic) return null;
      let t = item.t === '@param' ? paramValue : evalNumber(item.t, paramValue, 0);
      if (board.param?.unit === '°') t = (t * Math.PI) / 180;
      const p = pointOnConic(conic, t, paramValue);
      return { type: 'point', x: p.x, y: p.y, color: item.color, label: item.name, emphasis: item.emphasis };
    }

    case 'point_reflect': {
      const pt = solved[item.of];
      if (!pt) return null;
      const center = Array.isArray(item.center) ? item.center : [0, 0];
      const cx = evalNumber(center[0], paramValue, 0);
      const cy = evalNumber(center[1], paramValue, 0);
      return {
        type: 'point',
        x: 2 * cx - pt.x,
        y: 2 * cy - pt.y,
        color: item.color,
        label: item.name,
        emphasis: item.emphasis,
      };
    }

    default:
      return null;
  }
}

/**
 * 直线与圆锥曲线求交
 */
function intersectLineConic(line, conic, paramValue) {
  const a = evalNumber(conic.a, paramValue, 2);
  const b = evalNumber(conic.b, paramValue, 1);
  const center = conic.center || [0, 0];
  const cx = evalNumber(center[0], paramValue, 0);
  const cy = evalNumber(center[1], paramValue, 0);

  if (conic.kind === 'ellipse' || conic.kind === 'circle') {
    const r = conic.kind === 'circle' ? evalNumber(conic.r, paramValue, 1) : null;
    const aa = r ? r : a;
    const bb = r ? r : b;
    return intersectLineEllipse(line, aa, bb, cx, cy);
  } else if (conic.kind === 'parabola') {
    const p = evalNumber(conic.p, paramValue, 1);
    return intersectLineParabola(line, p, conic.axis || 'x', cx, cy);
  } else if (conic.kind === 'hyperbola') {
    return intersectLineHyperbola(line, a, b, cx, cy);
  }
  return [];
}

function intersectLineEllipse(line, a, b, cx, cy) {
  // 椭圆：(x-cx)²/a² + (y-cy)²/b² = 1
  // 直线：y - y0 = k(x - x0)，或 x = x0（竖直）
  const { x0, y0, slope } = line;
  
  if (!Number.isFinite(slope)) {
    // 竖直线 x = x0
    const dx = x0 - cx;
    if (Math.abs(dx) > a) return [];
    const dy = b * Math.sqrt(1 - (dx * dx) / (a * a));
    return [
      { x: x0, y: cy + dy },
      { x: x0, y: cy - dy },
    ].sort((p1, p2) => p2.y - p1.y);
  }

  // y = kx + c，代入椭圆
  const c = y0 - slope * x0;
  const A = b * b + a * a * slope * slope;
  const B = 2 * a * a * slope * (c - cy - slope * cx) - 2 * b * b * cx;
  const C = b * b * cx * cx + a * a * (c - cy) * (c - cy) - a * a * b * b;
  const delta = B * B - 4 * A * C;
  if (delta < 0) return [];
  
  const sd = Math.sqrt(delta);
  const x1 = (-B + sd) / (2 * A);
  const x2 = (-B - sd) / (2 * A);
  return [
    { x: x1, y: slope * x1 + c },
    { x: x2, y: slope * x2 + c },
  ].sort((p1, p2) => p2.y - p1.y);
}

function intersectLineParabola(line, p, axis, cx, cy) {
  // y² = 2px (axis='x')，代入 y = kx + c
  const { x0, y0, slope } = line;
  
  if (!Number.isFinite(slope)) {
    // x = x0
    const dy = Math.sqrt(2 * p * (x0 - cx));
    return [
      { x: x0, y: cy + dy },
      { x: x0, y: cy - dy },
    ].sort((p1, p2) => p2.y - p1.y);
  }

  const c = y0 - slope * x0;
  // y = kx + c，y² = 2p(x - cx)
  // (kx + c - cy)² = 2p(x - cx)
  // k²x² + ... 略
  const A = slope * slope;
  const B = 2 * slope * (c - cy) - 2 * p;
  const C = (c - cy) * (c - cy) + 2 * p * cx;
  const delta = B * B - 4 * A * C;
  if (delta < 0) return [];

  const sd = Math.sqrt(delta);
  const x1 = (-B + sd) / (2 * A);
  const x2 = (-B - sd) / (2 * A);
  return [
    { x: x1, y: slope * x1 + c },
    { x: x2, y: slope * x2 + c },
  ].sort((p1, p2) => p2.y - p1.y);
}

function intersectLineHyperbola(line, a, b, cx, cy) {
  // x²/a² - y²/b² = 1
  const { x0, y0, slope } = line;
  
  if (!Number.isFinite(slope)) {
    const dx = x0 - cx;
    if (Math.abs(dx) < a) return [];
    const dy = b * Math.sqrt((dx * dx) / (a * a) - 1);
    return [
      { x: x0, y: cy + dy },
      { x: x0, y: cy - dy },
    ].sort((p1, p2) => p2.y - p1.y);
  }

  const c = y0 - slope * x0;
  const A = b * b - a * a * slope * slope;
  const B = -2 * a * a * slope * (c - cy - slope * cx) - 2 * b * b * cx;
  const C = b * b * cx * cx - a * a * (c - cy) * (c - cy) - a * a * b * b;
  
  if (Math.abs(A) < 1e-9) return []; // 渐近线
  const delta = B * B - 4 * A * C;
  if (delta < 0) return [];

  const sd = Math.sqrt(delta);
  const x1 = (-B + sd) / (2 * A);
  const x2 = (-B - sd) / (2 * A);
  return [
    { x: x1, y: slope * x1 + c },
    { x: x2, y: slope * x2 + c },
  ].sort((p1, p2) => p2.y - p1.y);
}

function pointOnConic(conic, t, paramValue) {
  const a = evalNumber(conic.a, paramValue, 2);
  const b = evalNumber(conic.b, paramValue, 1);
  const center = conic.center || [0, 0];
  const cx = evalNumber(center[0], paramValue, 0);
  const cy = evalNumber(center[1], paramValue, 0);

  if (conic.kind === 'ellipse' || conic.kind === 'circle') {
    const r = conic.kind === 'circle' ? evalNumber(conic.r, paramValue, 1) : null;
    const aa = r || a;
    const bb = r || b;
    return { x: cx + aa * Math.cos(t), y: cy + bb * Math.sin(t) };
  } else if (conic.kind === 'parabola') {
    const p = evalNumber(conic.p, paramValue, 1);
    const u = t; // 参数 t 直接作为 y 坐标偏移
    return { x: cx + (u * u) / (2 * p), y: cy + u };
  }
  return { x: cx, y: cy };
}

/**
 * 计算 readout 的值
 */
export function computeReadout(readout, solved, board, paramValue) {
  switch (readout.type) {
    case 'expr':
      return evalNumber(readout.expr, paramValue, paramValue);

    case 'coord': {
      const pt = solved[readout.of];
      if (!pt) return null;
      return { x: pt.x, y: pt.y };
    }

    case 'slope': {
      const line = solved[readout.of];
      if (!line || line.type !== 'line') return null;
      return line.slope;
    }

    case 'length': {
      const a = solved[readout.a];
      const b = solved[readout.b];
      if (!a || !b) return null;
      return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    case 'distance': {
      const a = solved[readout.a];
      const b = solved[readout.b];
      if (!a || !b) return null;
      return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    case 'area_triangle': {
      const pts = (readout.pts || []).map((name) => solved[name]).filter(Boolean);
      if (pts.length < 3) return null;
      const [p0, p1, p2] = pts;
      return Math.abs((p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y)) / 2;
    }

    case 'dot': {
      const va = solved[readout.a];
      const vb = solved[readout.b];
      if (!va || !vb || va.type !== 'vector' || vb.type !== 'vector') return null;
      const dx1 = va.to.x - va.from.x;
      const dy1 = va.to.y - va.from.y;
      const dx2 = vb.to.x - vb.from.x;
      const dy2 = vb.to.y - vb.from.y;
      return dx1 * dx2 + dy1 * dy2;
    }

    case 'slope_product': {
      const la = solved[readout.a];
      const lb = solved[readout.b];
      if (!la || !lb || la.type !== 'line' || lb.type !== 'line') return null;
      return la.slope * lb.slope;
    }

    case 'status': {
      const val = evalNumber(readout.expr, paramValue, paramValue);
      const rhs = evalNumber(readout.rhs, paramValue, 0);
      let ok = false;
      switch (readout.op) {
        case '<=': ok = val <= rhs; break;
        case '>=': ok = val >= rhs; break;
        case '<': ok = val < rhs; break;
        case '>': ok = val > rhs; break;
        case '==': ok = Math.abs(val - rhs) < 1e-6; break;
        default: ok = false;
      }
      return ok ? (readout.okText || '满足') : (readout.badText || '不满足');
    }

    case 'distance_point_line': {
      const pt = solved[readout.point];
      const line = solved[readout.line];
      if (!pt || !line || line.type !== 'line') return null;
      // 点(x1,y1)到直线 y-y0=k(x-x0) 的距离
      // |kx1 - y1 + (y0 - k*x0)| / sqrt(k²+1)
      const { x0, y0, slope: k } = line;
      if (!Number.isFinite(k)) return Math.abs(pt.x - x0);
      const c = y0 - k * x0;
      return Math.abs(k * pt.x - pt.y + c) / Math.sqrt(k * k + 1);
    }

    default:
      return null;
  }
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

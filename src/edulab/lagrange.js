// 太阳—地球圆型限制性三体问题（CR3BP）的拉格朗日点解算。
//
// 约定：
// - 归一化单位：日地距 = 1，公转角速度 = 1 圈/年。
// - 日心坐标系：太阳在原点，地球在 (1, 0)，x 轴指向地球。
// - 旋转坐标系（随地球公转）：5 个点位置固定；惯性系里整体绕太阳旋转 θ。
//
// 共线点 L1/L2/L3 没有闭式解。教科书里的 γ ≈ (μ/3)^(1/3) 之类是 μ→0 的
// 近似式，在 L3 上误差可达 30%（L3 的真实偏移是 O(μ)，不是 O(μ^(1/3))）。
// 这里直接对有效势的驻点方程做二分，精度到机器浮点，不依赖任何展开。

export const MU_SUN_EARTH = 3.0034896e-6; // m_地球 / (m_太阳 + m_地球)
export const AU_KM = 149597870.7;

const BARYCENTER_SUN = -MU_SUN_EARTH; // 质心坐标系里太阳的位置
const BARYCENTER_EARTH = 1 - MU_SUN_EARTH; // 质心坐标系里地球的位置

// 有效势 ∂Ω/∂x = 0 的残差（质心坐标系，y = 0）。
function collinearResidual(mu, x) {
  const rSun = Math.abs(x + mu);
  const rEarth = Math.abs(x - 1 + mu);
  return x - (1 - mu) * (x + mu) / (rSun ** 3) - mu * (x - 1 + mu) / (rEarth ** 3);
}

// 二分求根。区间两端残差异号，函数在区间内单调穿过零点。
function bisect(fn, lo, hi) {
  let flo = fn(lo);
  let a = lo;
  let b = hi;
  for (let i = 0; i < 120; i += 1) {
    const mid = (a + b) / 2;
    const fm = fn(mid);
    if (flo * fm <= 0) {
      b = mid;
    } else {
      a = mid;
      flo = fm;
    }
  }
  return (a + b) / 2;
}

// 三个共线点，返回日心坐标（太阳在原点）下的 x。
export function collinearPointsSunCentered(mu = MU_SUN_EARTH) {
  const l1Core = bisect(
    (x) => collinearResidual(mu, x),
    BARYCENTER_SUN + 1e-12,
    BARYCENTER_EARTH - 1e-12,
  );
  const l2Core = bisect(
    (x) => collinearResidual(mu, x),
    BARYCENTER_EARTH + 1e-12,
    2,
  );
  const l3Core = bisect(
    (x) => collinearResidual(mu, x),
    -2,
    BARYCENTER_SUN - 1e-12,
  );
  return { L1: l1Core + mu, L2: l2Core + mu, L3: l3Core + mu };
}

// 旋转坐标系下的 5 个点。太阳在 (0,0)，地球在 (1,0)。
export function lagrangePointsRotating(mu = MU_SUN_EARTH) {
  const { L1, L2, L3 } = collinearPointsSunCentered(mu);
  const y = Math.sqrt(3) / 2; // 正三角形的高，L4/L5 与日、地各距 1
  return {
    L1: [L1, 0],
    L2: [L2, 0],
    L3: [L3, 0],
    L4: [0.5, y],
    L5: [0.5, -y],
  };
}

// 把旋转坐标系的位置转到惯性系（地球公转角 θ，弧度）。
export function rotateToInertial([x, y], theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [x * c - y * s, x * s + y * c];
}

// 地球日心黄经（弧度）。
// 用 Meeus 低精度太阳位置公式（误差 < 0.01°），地球黄经 = 太阳视黄经 + 180°。
export function earthHeliocentricLongitude(date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0; // 距 J2000.0 的天数
  const deg = Math.PI / 180;
  const L = 280.46 + 0.9856474 * n; // 太阳平黄经
  const g = 357.528 + 0.9856003 * n; // 太阳平近点角
  const lambdaSun = L + 1.915 * Math.sin(g * deg) + 0.02 * Math.sin(2 * g * deg);
  const earth = lambdaSun + 180;
  return (((earth % 360) + 360) % 360) * deg;
}

function normDeg(value) {
  return ((value % 360) + 360) % 360;
}

// 一次性给出渲染需要的全部数据：
// thetaDeg 旋转角（度），exaggerate 只放大 L1/L2 相对地球的偏移（示意图用）。
export function lagrangeSnapshot(thetaDeg, { mu = MU_SUN_EARTH, exaggerate = 1 } = {}) {
  const theta = thetaDeg * (Math.PI / 180);
  const rotating = lagrangePointsRotating(mu);
  const earthRotating = [1, 0];

  const points = {};
  ['L1', 'L2', 'L3', 'L4', 'L5'].forEach((id) => {
    const base = rotating[id];
    // 真实位置：读数一律用这一组，夸张系数只影响画图
    const inertial = rotateToInertial(base, theta);
    const toEarth = Math.hypot(inertial[0] - Math.cos(theta), inertial[1] - Math.sin(theta));

    let display = inertial;
    const canExaggerate = id === 'L1' || id === 'L2';
    if (canExaggerate && exaggerate !== 1) {
      // 只放大横轴偏移，方向保持不变
      const offset = base[0] - 1;
      display = rotateToInertial([1 + offset * exaggerate, 0], theta);
    }

    points[id] = {
      id,
      angleDeg: normDeg(thetaDeg + Math.atan2(base[1], base[0]) * (180 / Math.PI)),
      inertial,
      display,
      sunAU: Math.hypot(inertial[0], inertial[1]),
      earthAU: toEarth,
      earthKm: toEarth * AU_KM,
      exact: base,
      exaggerated: display !== inertial,
    };
  });

  const earthInertial = rotateToInertial(earthRotating, theta);
  return {
    thetaDeg: normDeg(thetaDeg),
    earth: { inertial: earthInertial, angleDeg: normDeg(thetaDeg) },
    points,
  };
}

// 距离格式化：AU 与万公里两种读数。
export function formatDistance(au) {
  const km = au * AU_KM;
  if (Math.abs(au) >= 0.5) return `${au.toFixed(6)} AU`;
  if (Math.abs(km) >= 10000) return `${(km / 10000).toFixed(1)} 万 km`;
  return `${Math.round(km)} km`;
}

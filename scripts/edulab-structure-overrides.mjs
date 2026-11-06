// 仓库自有的结构覆写：修上游 edulab 生成器里化学上不成立/不合适的分子几何。
//
// 目前只处理一件事：葡萄糖。
// 上游 `edu-chem-reaction` 的 _glucose_openchain() 把 D-葡萄糖画成沿 Y 轴的一条直线
// （C-C-C 键角 180°），在 `葡萄糖的有氧氧化` 里既不是真实几何，也和化合物模块的
// β-D-吡喃糖对不上。这里用同一套环状椅式几何覆写反应物一侧，产物端与形变映射不动。
//
// 由 scripts/edulab-export.mjs 在导出后调用，保证 `npm run edulab:export` 不会把修正冲掉。

const DEG = Math.PI / 180;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const round3 = (v) => v.map((n) => Math.round(n * 1000) / 1000);

// 椅式六元环骨架（C1-C2-C3-C4-C5-O5），单位约等于化学键长 1.5
const RING = [
  ['C1', 'C', [1.26, 0.0, 0.4]],
  ['C2', 'C', [0.63, 1.09, -0.52]],
  ['C3', 'C', [-0.84, 0.68, -0.94]],
  ['C4', 'C', [-1.57, -0.36, 0.05]],
  ['C5', 'C', [-0.89, -1.46, 0.99]],
  ['O5', 'O', [0.52, -1.05, 1.36]],
];

/**
 * 生成 β-D-吡喃葡萄糖（椅式）的完整几何。
 * 24 个原子：C×6、O×6（5 个羟基 + 1 个环氧）、H×12。
 * 取代基按四面体角（109.47°）布置，避免原子重叠。
 * id 与化学反应课程里的原子 id 一一对应，方便直接覆写反应物端。
 */
export function buildGlucopyranose() {
  const pos = Object.fromEntries(RING.map(([id, , p]) => [id, p]));
  const atoms = RING.map(([id, el, p]) => ({ id, el, pos: round3(p) }));
  const bonds = [
    { a: 'C1', b: 'C2', order: 1 },
    { a: 'C2', b: 'C3', order: 1 },
    { a: 'C3', b: 'C4', order: 1 },
    { a: 'C4', b: 'C5', order: 1 },
    { a: 'C5', b: 'O5', order: 1 },
    { a: 'O5', b: 'C1', order: 1 },
  ];

  // 已知两条键方向，求另外两条四面体方向
  const otherTwo = (b1, b2) => {
    const m = norm(add(b1, b2));
    const p = norm(cross(b1, b2));
    return [
      norm(add(mul(m, -0.5774), mul(p, 0.8165))),
      norm(add(mul(m, -0.5774), mul(p, -0.8165))),
    ];
  };
  // 已知一条键方向，求绕它均布的三条四面体方向
  const threeAround = (u) => {
    const helper = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const e2 = norm(cross(u, helper));
    const e3 = norm(cross(u, e2));
    return [0, 120, 240].map((deg) => norm(add(
      mul(u, Math.cos(70.53 * DEG)),
      mul(add(mul(e2, Math.cos(deg * DEG)), mul(e3, Math.sin(deg * DEG))), Math.sin(70.53 * DEG)),
    )));
  };
  const bondDir = (from, to) => norm(sub(pos[to] ?? from, pos[from] ?? to));

  const OH_LEN = 1.42;
  const CH_LEN = 1.06;
  const OH_H_LEN = 0.96;

  // C1..C4 各挂一个羟基 + 一个氢，羟基的上下朝向交替
  const hydroxyls = [
    ['C1', 'O5', 'C2', 'O1', 'H1', 'H2'],
    ['C2', 'C1', 'C3', 'O2', 'H3', 'H4'],
    ['C3', 'C2', 'C4', 'O3', 'H5', 'H6'],
    ['C4', 'C3', 'C5', 'O4', 'H7', 'H8'],
  ];
  hydroxyls.forEach(([carbon, nb1, nb2, oId, hOnC, hOnO], idx) => {
    const p = pos[carbon];
    const [d1, d2] = otherTwo(bondDir(carbon, nb1), bondDir(carbon, nb2));
    const up = idx % 2 === 0 ? d1 : d2;
    const down = idx % 2 === 0 ? d2 : d1;
    const oPos = add(p, mul(up, OH_LEN));
    const hPos = add(p, mul(down, CH_LEN));
    // 羟基氢：与 C-O 键约 109°
    const tangent = norm(cross(up, [0, 0, 1]));
    const hDir = norm(add(mul(up, Math.cos(109.47 * DEG)), mul(tangent, Math.sin(109.47 * DEG))));
    const hoPos = add(oPos, mul(hDir, OH_H_LEN));
    atoms.push({ id: oId, el: 'O', pos: round3(oPos) });
    atoms.push({ id: hOnC, el: 'H', pos: round3(hPos) });
    atoms.push({ id: hOnO, el: 'H', pos: round3(hoPos) });
    bonds.push(
      { a: carbon, b: oId, order: 1 },
      { a: carbon, b: hOnC, order: 1 },
      { a: oId, b: hOnO, order: 1 },
    );
  });

  // C5：一个氢 + 羟甲基 C6
  const [c5a, c5b] = otherTwo(bondDir('C5', 'C4'), bondDir('C5', 'O5'));
  const h9Pos = add(pos.C5, mul(c5a, CH_LEN));
  const c6Pos = add(pos.C5, mul(c5b, 1.52));
  atoms.push({ id: 'H9', el: 'H', pos: round3(h9Pos) });
  atoms.push({ id: 'C6', el: 'C', pos: round3(c6Pos) });
  bonds.push({ a: 'C5', b: 'H9', order: 1 }, { a: 'C5', b: 'C6', order: 1 });

  // C6：一个羟基 + 两个氢
  const [d0, d1, d2] = threeAround(norm(sub(c6Pos, pos.C5)));
  const o6Pos = add(c6Pos, mul(d0, OH_LEN));
  const h11Pos = add(c6Pos, mul(d1, CH_LEN));
  const h12Pos = add(c6Pos, mul(d2, CH_LEN));
  const t6 = norm(cross(norm(sub(o6Pos, c6Pos)), [0, 0, 1]));
  const h10Dir = norm(add(mul(d0, Math.cos(109.47 * DEG)), mul(t6, Math.sin(109.47 * DEG))));
  atoms.push({ id: 'O6', el: 'O', pos: round3(o6Pos) });
  atoms.push({ id: 'H11', el: 'H', pos: round3(h11Pos) });
  atoms.push({ id: 'H12', el: 'H', pos: round3(h12Pos) });
  atoms.push({ id: 'H10', el: 'H', pos: round3(add(o6Pos, mul(h10Dir, OH_H_LEN))) });
  bonds.push(
    { a: 'C6', b: 'O6', order: 1 },
    { a: 'C6', b: 'H11', order: 1 },
    { a: 'C6', b: 'H12', order: 1 },
    { a: 'O6', b: 'H10', order: 1 },
  );

  return { atoms, bonds };
}

export function translateGeometry(geometry, offset) {
  return {
    atoms: geometry.atoms.map((a) => ({ ...a, pos: round3(add(a.pos, offset)) })),
    bonds: geometry.bonds.map((b) => ({ ...b })),
  };
}

export const _internal = { sub, add, mul, norm, cross, round3, DEG };
// ————————————————————————————————————————————————
// 化学反应课程覆写：葡萄糖的有氧氧化
// ————————————————————————————————————————————————

// 反应物/产物在画面里的布局（单位与场景一致，跨度约 13×5，默认相机 + 自适应取景都能完整看到）
const GLUCOSE_CENTER = [-3.9, 0, 0];
// 6 个 O₂ 围成一圈摆开：排成两列会连成 O₄ 一样的糖葫芦，容易被误读
const O2_GRID = [
  [3.4, 2.6], [5.65, 1.3], [5.65, -1.3],
  [3.4, -2.6], [1.15, -1.3], [1.15, 1.3],
];
// 6 个 CO₂ 竖放成 3×2，竖放才不会横向连成一条链
const CO2_GRID = [
  [1.2, 1.5], [3.4, 1.5], [5.6, 1.5],
  [1.2, -1.5], [3.4, -1.5], [5.6, -1.5],
];
const H2O_GRID = [
  [-6.6, 1.5], [-4.4, 1.5], [-2.2, 1.5],
  [-6.6, -1.5], [-4.4, -1.5], [-2.2, -1.5],
];
const CO2_HALF = 1.16;
const H2O_H_OFFSETS = [[0.7591, -0.0123, 0], [-0.7591, 0.5877, 0]];

/**
 * 把 `chem-glucose-combustion` 的反应物端换成 β-D-吡喃糖环状结构，
 * 并把整场重排成紧凑布局（原来的坐标跨度 39 个单位，默认相机只能看到中间一小段）。
 * 产物端与「每个 C→CO₂、每个 O/H→H₂O」的映射保持原样，形变动画逻辑不变。
 */
export function applyGlucoseCombustionOverride(payload) {
  const raw = buildGlucopyranose();
  // 以整体包围盒中心对齐到布局位置，避免分子重心偏下把画面顶歪
  const xs = raw.atoms.map((a) => a.pos[0]);
  const ys = raw.atoms.map((a) => a.pos[1]);
  const zs = raw.atoms.map((a) => a.pos[2]);
  const center = [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
    (Math.min(...zs) + Math.max(...zs)) / 2,
  ];
  const glucose = translateGeometry(raw, sub(GLUCOSE_CENTER, center));
  const startOf = new Map(glucose.atoms.map((a) => [a.id, round3(a.pos)]));

  const atoms = payload.atoms.map((atom) => {
    const next = { ...atom };
    if (startOf.has(atom.id)) next.start = startOf.get(atom.id);

    if (/^C\d+$/.test(atom.id)) {
      const i = Number(atom.id.slice(1)) - 1;
      next.end = [CO2_GRID[i][0], CO2_GRID[i][1], 0];
    } else if (/^O(\d+)$/.test(atom.id) && Number(atom.id.slice(1)) <= 6) {
      const i = Number(atom.id.slice(1)) - 1;
      next.end = [H2O_GRID[i][0], H2O_GRID[i][1], 0];
    } else if (/^H(\d+)$/.test(atom.id)) {
      const i = Number(atom.id.slice(1)) - 1;
      const water = Math.floor(i / 2);
      next.end = round3(add([H2O_GRID[water][0], H2O_GRID[water][1], 0], H2O_H_OFFSETS[i % 2]));
    } else if (/^O(\d+)$/.test(atom.id)) {
      const i = Number(atom.id.slice(1));
      const oxy = Math.floor((i - 7) / 2);
      const side = (i - 7) % 2 === 0 ? -1 : 1;
      next.start = [O2_GRID[oxy][0] + side * 0.55, O2_GRID[oxy][1], 0];
      next.end = [
        CO2_GRID[oxy][0],
        CO2_GRID[oxy][1] + side * CO2_HALF,
        0,
      ];
    }
    return next;
  });

  const oxygenBonds = [7, 9, 11, 13, 15, 17].map((i) => ({
    a: 'O' + i,
    b: 'O' + (i + 1),
    order: 2,
  }));

  const before = [...glucose.bonds, ...oxygenBonds];
  const after = payload.bonds.after;

  // 文案同步：结构改成环状后，"1 个醛基（C=O）"的说法不成立
  const steps = (payload.steps || []).map((step) => {
    const html = step.html || step.content || '';
    if (!html.includes('6 碳醛糖')) return step;
    return {
      ...step,
      html: html.replace(
        /是 6 碳醛糖[^。]*共 24 个原子。/,
        '在水溶液中以六元环（β-D-吡喃型）存在，含 1 个环内氧、5 个羟基（C–OH）和 5 根 C–C 骨架键，共 24 个原子。',
      ),
    };
  });

  return {
    ...payload,
    atoms,
    steps,
    bonds: { ...payload.bonds, before, after, broken: before, formed: after, kept: [] },
  };
}

export function applyStructureOverrides(envelope) {
  if (envelope?.id === 'chem-glucose-combustion') {
    return { ...envelope, payload: applyGlucoseCombustionOverride(envelope.payload) };
  }
  return envelope;
}
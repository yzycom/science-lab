// 仓库自建的化学反応课程：上游 @wy51ai/edulab 只提供 6 个 builder，
// 这里用手写 payload 补 10 节常用反应，数据结构与上游完全一致
// （meta / atoms / bonds.before|after / steps / energy / elementCounts ...）。
//
// 坐标约定：单位约等于键长 1.5，原子在 t=0 摆在反应物位置、t=1 走到产物位置，
// 元素映射用「同元素最近邻」自动配对，保证原子守恒且迁移路径最短。

import { REAL_WORLD } from './edulab-real-world.mjs';

const ELEMENTS = {
  H: { color: '#f1f5f9', radius: 0.25, name: '氢' },
  C: { color: '#334155', radius: 0.5, name: '碳' },
  N: { color: '#3b82f6', radius: 0.46, name: '氮' },
  O: { color: '#ef4444', radius: 0.42, name: '氧' },
  Na: { color: '#a855f7', radius: 0.58, name: '钠' },
  Mg: { color: '#facc15', radius: 0.55, name: '镁' },
  Cl: { color: '#22c55e', radius: 0.52, name: '氯' },
  Ca: { color: '#fb923c', radius: 0.6, name: '钙' },
  Fe: { color: '#b45309', radius: 0.56, name: '铁' },
};

// 物种：atoms = [id, 元素, [x,y,z]]；bonds = [原子下标A, 原子下标B, 键级]
// —— 几何小工具：按四面体角摆取代基，避免手写坐标出现重叠或长短键 ——
const DEG = Math.PI / 180;
const vAdd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vMul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const vNorm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const vCross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
// 已知一条键方向，求绕它均布的三条四面体方向
const threeAround = (u) => {
  const helper = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const e2 = vNorm(vCross(u, helper));
  const e3 = vNorm(vCross(u, e2));
  return [0, 120, 240].map((deg) => vNorm(vAdd(
    vMul(u, Math.cos(70.53 * DEG)),
    vMul(vAdd(vMul(e2, Math.cos(deg * DEG)), vMul(e3, Math.sin(deg * DEG))), Math.sin(70.53 * DEG)),
  )));
};
// 已知两条键方向，求另外两条四面体方向
const otherTwo = (b1, b2) => {
  const m = vNorm(vAdd(b1, b2));
  const p = vNorm(vCross(b1, b2));
  return [
    vNorm(vAdd(vMul(m, -0.5774), vMul(p, 0.8165))),
    vNorm(vAdd(vMul(m, -0.5774), vMul(p, -0.8165))),
  ];
};
const round3 = (v) => v.map((n) => Math.round(n * 1000) / 1000);

function buildEthanol() {
  const c1 = [0, 0, 0];
  const dirCC = vNorm([1.45, 0.47, 0]);
  const c2 = vAdd(c1, vMul(dirCC, 1.52));
  // O 与 C1 在 C2 两侧，C–C–O 取四面体角
  const dirCO = vNorm(vAdd(vMul(dirCC, Math.cos(109.47 * DEG)), vMul(vNorm(vCross(dirCC, [0, 0, 1])), Math.sin(109.47 * DEG))));
  const o = vAdd(c2, vMul(dirCO, 1.43));

  const atoms = [['C1', 'C', round3(c1)], ['C2', 'C', round3(c2)], ['O', 'O', round3(o)]];
  const bonds = [[0, 1, 1], [1, 2, 1]];

  threeAround(vMul(dirCC, -1)).forEach((dir, i) => {
    atoms.push([`H1${i + 1}`, 'H', round3(vAdd(c1, vMul(dir, 1.09)))]);
    bonds.push([0, atoms.length - 1, 1]);
  });
  otherTwo(vMul(dirCC, -1), dirCO).forEach((dir, i) => {
    atoms.push([`H2${i + 1}`, 'H', round3(vAdd(c2, vMul(dir, 1.09)))]);
    bonds.push([1, atoms.length - 1, 1]);
  });
  const hDir = threeAround(vMul(dirCO, -1))[0];
  atoms.push(['H6', 'H', round3(vAdd(o, vMul(hDir, 0.96)))]);
  bonds.push([2, atoms.length - 1, 1]);

  return { atoms, bonds };
}

const SPECIES = {
  C: { atoms: [['C', 'C', [0, 0, 0]]], bonds: [] },
  O2: { atoms: [['Oa', 'O', [-0.62, 0, 0]], ['Ob', 'O', [0.62, 0, 0]]], bonds: [[0, 1, 2]] },
  H2: { atoms: [['Ha', 'H', [-0.4, 0, 0]], ['Hb', 'H', [0.4, 0, 0]]], bonds: [[0, 1, 1]] },
  N2: { atoms: [['Na', 'N', [-0.6, 0, 0]], ['Nb', 'N', [0.6, 0, 0]]], bonds: [[0, 1, 3]] },
  CO: { atoms: [['C', 'C', [-0.62, 0, 0]], ['O', 'O', [0.62, 0, 0]]], bonds: [[0, 1, 3]] },
  CO2: {
    atoms: [['C', 'C', [0, 0, 0]], ['O1', 'O', [-1.18, 0, 0]], ['O2', 'O', [1.18, 0, 0]]],
    bonds: [[0, 1, 2], [0, 2, 2]],
  },
  H2O: {
    atoms: [['O', 'O', [0, 0.3, 0]], ['H1', 'H', [-0.76, -0.28, 0]], ['H2', 'H', [0.76, -0.28, 0]]],
    bonds: [[0, 1, 1], [0, 2, 1]],
  },
  NH3: {
    atoms: [
      ['N', 'N', [0, 0.28, 0]],
      ['H1', 'H', [-0.93, -0.22, 0]],
      ['H2', 'H', [0.47, -0.22, 0.81]],
      ['H3', 'H', [0.47, -0.22, -0.81]],
    ],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]],
  },
  Mg: { atoms: [['Mg', 'Mg', [0, 0, 0]]], bonds: [] },
  MgO: { atoms: [['Mg', 'Mg', [-0.9, 0, 0]], ['O', 'O', [0.9, 0, 0]]], bonds: [[0, 1, 1]] },
  Fe: { atoms: [['Fe', 'Fe', [0, 0, 0]]], bonds: [] },
  Fe2O3: {
    atoms: [
      ['Fe1', 'Fe', [-1.25, 0, 0]],
      ['Fe2', 'Fe', [1.25, 0, 0]],
      ['O1', 'O', [0, 1.0, 0]],
      ['O2', 'O', [0, -1.0, 0]],
      ['O3', 'O', [0, 0, 0.95]],
    ],
    bonds: [[0, 2, 1], [0, 3, 1], [0, 4, 1], [1, 2, 1], [1, 3, 1], [1, 4, 1]],
  },
  Na: { atoms: [['Na', 'Na', [0, 0, 0]]], bonds: [] },
  NaOH: {
    atoms: [['Na', 'Na', [-1.35, 0, 0]], ['O', 'O', [0.15, 0, 0]], ['H', 'H', [1.05, 0.42, 0]]],
    bonds: [[0, 1, 1], [1, 2, 1]],
  },
  HCl: { atoms: [['H', 'H', [-0.66, 0, 0]], ['Cl', 'Cl', [0.66, 0, 0]]], bonds: [[0, 1, 1]] },
  NaCl: { atoms: [['Na', 'Na', [-0.8, 0, 0]], ['Cl', 'Cl', [0.8, 0, 0]]], bonds: [[0, 1, 1]] },
  Ca: { atoms: [['Ca', 'Ca', [0, 0, 0]]], bonds: [] },
  CaO: { atoms: [['Ca', 'Ca', [-1.0, 0, 0]], ['O', 'O', [1.0, 0, 0]]], bonds: [[0, 1, 1]] },
  CaCl2: {
    atoms: [['Ca', 'Ca', [0, 0, 0]], ['Cl1', 'Cl', [-1.45, 0.75, 0]], ['Cl2', 'Cl', [1.45, 0.75, 0]]],
    bonds: [[0, 1, 1], [0, 2, 1]],
  },
  CaCO3: {
    atoms: [
      ['C', 'C', [0, 0, 0]],
      ['O1', 'O', [1.18, 0, 0]],
      ['O2', 'O', [-0.59, 1.02, 0]],
      ['O3', 'O', [-0.59, -1.02, 0]],
      ['Ca', 'Ca', [-1.95, 1.02, 0]],
    ],
    // 碳酸根是三角形，Ca²⁺ 靠静电作用贴在其中一个氧上（离子键用细杆示意）
    bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [4, 2, 1]],
  },
  C2H5OH: buildEthanol(),
};

const FORMULA = {
  C: 'C', O2: 'O₂', H2: 'H₂', N2: 'N₂', CO: 'CO', CO2: 'CO₂', H2O: 'H₂O', NH3: 'NH₃',
  Mg: 'Mg', MgO: 'MgO', Fe: 'Fe', Fe2O3: 'Fe₂O₃', Na: 'Na', NaOH: 'NaOH', HCl: 'HCl',
  NaCl: 'NaCl', Ca: 'Ca', CaO: 'CaO', CaCl2: 'CaCl₂', CaCO3: 'CaCO₃', C2H5OH: 'C₂H₅OH',
};

const NAME = {
  C: '碳', O2: '氧气', H2: '氢气', N2: '氮气', CO: '一氧化碳', CO2: '二氧化碳', H2O: '水',
  NH3: '氨', Mg: '镁', MgO: '氧化镁', Fe: '铁', Fe2O3: '氧化铁', Na: '钠', NaOH: '氢氧化钠',
  HCl: '氯化氢', NaCl: '氯化钠', Ca: '钙', CaO: '氧化钙', CaCl2: '氯化钙', CaCO3: '碳酸钙',
  C2H5OH: '乙醇',
};

const CAPTION_COLOR = {
  C: 'slate', O2: 'red', H2: 'sky', N2: 'blue', CO: 'slate', CO2: 'slate', H2O: 'cyan',
  NH3: 'blue', Mg: 'emerald', MgO: 'emerald', Fe: 'amber', Fe2O3: 'amber', Na: 'violet',
  NaOH: 'violet', HCl: 'emerald', NaCl: 'violet', Ca: 'orange', CaO: 'orange',
  CaCl2: 'orange', CaCO3: 'orange', C2H5OH: 'amber',
};

// —— 10 节反应 ——
// reactants / products: [{ species, count }]
const REACTIONS = [
  {
    id: 'chem-carbon-combustion',
    title: '碳的完全燃烧',
    subtitle: 'C + O₂ → CO₂（氧气充足，放热 393.5 kJ/mol）',
    equation: '\\text{C} + \\text{O}_2 \\;\\xrightarrow{\\text{点燃}}\\; \\text{CO}_2',
    reactantLabel: 'C+O₂', productLabel: 'CO₂',
    deltaH: -1, activation: 0.55,
    reactants: [{ species: 'C', count: 1 }, { species: 'O2', count: 1 }],
    products: [{ species: 'CO2', count: 1 }],
    steps: [
      ['反应物混合', '碳单质与氧气分子在点燃条件下接触。C=O 键的生成能远大于 O=O 键与碳的升华能，因此反应一旦启动就持续放热。'],
      ['断键与成键', 'O=O 双键断开，碳原子与两个氧原子分别形成两根 C=O 双键，碳由 0 价被氧化到 +4 价。'],
      ['生成二氧化碳', '产物是线形 CO₂ 分子（O=C=O，键角 180°）。反应前后 C 1 个、O 2 个，原子守恒。'],
    ],
  },
  {
    id: 'chem-co-combustion',
    title: '一氧化碳的燃烧',
    subtitle: '2CO + O₂ → 2CO₂（淡蓝色火焰，放热 566 kJ/mol）',
    equation: '2\\,\\text{CO} + \\text{O}_2 \\;\\xrightarrow{\\text{点燃}}\\; 2\\,\\text{CO}_2',
    reactantLabel: '2CO+O₂', productLabel: '2CO₂',
    deltaH: -0.85, activation: 0.5,
    reactants: [{ species: 'CO', count: 2 }, { species: 'O2', count: 1 }],
    products: [{ species: 'CO2', count: 2 }],
    steps: [
      ['反应物混合', '两个 CO 分子与一个 O₂ 分子混合。CO 中的 C≡O 三键很强，需要点燃提供活化能。'],
      ['三键断裂，双键生成', 'C≡O 三键与 O=O 双键断裂，每个碳原子与两个氧原子组成两根 C=O 双键。'],
      ['生成二氧化碳', '得到 2 个 CO₂。反应前 C 2、O 4，反应后仍是 C 2、O 4，原子守恒。'],
    ],
  },
  {
    id: 'chem-ammonia-synthesis',
    title: '工业合成氨',
    subtitle: 'N₂ + 3H₂ ⇌ 2NH₃（高温高压、铁触媒，放热 92.4 kJ/mol）',
    equation: '\\text{N}_2 + 3\\,\\text{H}_2 \\;\\underset{\\text{高温高压}}{\\overset{\\text{催化剂}}{\\rightleftharpoons}}\\; 2\\,\\text{NH}_3',
    reactantLabel: 'N₂+3H₂', productLabel: '2NH₃',
    deltaH: -0.35, activation: 0.75,
    reactants: [{ species: 'N2', count: 1 }, { species: 'H2', count: 3 }],
    products: [{ species: 'NH3', count: 2 }],
    steps: [
      ['反应物混合', '氮气与氢气按 1:3 混合。N≡N 三键键能高达 946 kJ/mol，常温下几乎不反应。'],
      ['三键断裂', '在铁触媒、高温高压下 N≡N 与 H–H 断裂，氮原子逐个与氢原子结合。'],
      ['生成氨', '每个氮原子结合 3 个氢，得到 2 个三角锥形 NH₃。反应前后 N 2、H 6，原子守恒；正反应放热，工业上要同时考虑速率与平衡。'],
    ],
  },
  {
    id: 'chem-magnesium-combustion',
    title: '镁条的燃烧',
    subtitle: '2Mg + O₂ → 2MgO（耀眼白光，放热 1204 kJ/mol）',
    equation: '2\\,\\text{Mg} + \\text{O}_2 \\;\\xrightarrow{\\text{点燃}}\\; 2\\,\\text{MgO}',
    reactantLabel: '2Mg+O₂', productLabel: '2MgO',
    deltaH: -1, activation: 0.65,
    reactants: [{ species: 'Mg', count: 2 }, { species: 'O2', count: 1 }],
    products: [{ species: 'MgO', count: 2 }],
    steps: [
      ['反应物混合', '两根镁条与氧气接触。镁是活泼金属，表面虽有氧化膜，点燃后仍能剧烈反应。'],
      ['失电子，断键', 'O=O 双键断开，每个镁原子失去 2 个电子被氧化为 +2 价，氧被还原为 −2 价。'],
      ['生成氧化镁', '得到 2 个 MgO（离子化合物，此处按式量单元简化表示）。反应前后 Mg 2、O 2，原子守恒。'],
    ],
  },
  {
    id: 'chem-ethanol-combustion',
    title: '乙醇的燃烧',
    subtitle: 'C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O（淡蓝色火焰，放热 1367 kJ/mol）',
    equation: '\\text{C}_2\\text{H}_5\\text{OH} + 3\\,\\text{O}_2 \\;\\xrightarrow{\\text{点燃}}\\; 2\\,\\text{CO}_2 + 3\\,\\text{H}_2\\text{O}',
    reactantLabel: 'C₂H₅OH+3O₂', productLabel: '2CO₂+3H₂O',
    deltaH: -1, activation: 0.6,
    reactants: [{ species: 'C2H5OH', count: 1 }, { species: 'O2', count: 3 }],
    products: [{ species: 'CO2', count: 2 }, { species: 'H2O', count: 3 }],
    steps: [
      ['反应物混合', '乙醇与氧气混合。乙醇分子中的 C–C、C–H、C–O、O–H 键都要断裂，需要点燃提供活化能。'],
      ['全面断键', '所有 C–H 与 C–C 键断开，氢与氧结合成水，碳被完全氧化成 +4 价。'],
      ['生成二氧化碳和水', '2 个碳生成 2 个 CO₂，6 个氢生成 3 个 H₂O。反应前后 C 2、H 6、O 7，原子守恒。'],
    ],
  },
  {
    id: 'chem-blast-furnace',
    title: '高炉炼铁',
    subtitle: 'Fe₂O₃ + 3CO → 2Fe + 3CO₂（高温，CO 作还原剂）',
    equation: '\\text{Fe}_2\\text{O}_3 + 3\\,\\text{CO} \\;\\xrightarrow{\\text{高温}}\\; 2\\,\\text{Fe} + 3\\,\\text{CO}_2',
    reactantLabel: 'Fe₂O₃+3CO', productLabel: '2Fe+3CO₂',
    deltaH: -0.25, activation: 0.8,
    reactants: [{ species: 'Fe2O3', count: 1 }, { species: 'CO', count: 3 }],
    products: [{ species: 'Fe', count: 2 }, { species: 'CO2', count: 3 }],
    steps: [
      ['反应物混合', '氧化铁与一氧化碳在高温下接触。CO 是还原剂，夺走氧化铁中的氧。'],
      ['氧原子转移', 'Fe–O 键断裂，氧原子转移给 CO 形成 C=O 双键；铁离子得到电子变成单质铁。'],
      ['生成铁与二氧化碳', '得到 2 个 Fe 与 3 个 CO₂。反应前后 Fe 2、C 3、O 6，原子守恒。'],
    ],
  },
  {
    id: 'chem-sodium-water',
    title: '钠与水的反应',
    subtitle: '2Na + 2H₂O → 2NaOH + H₂↑（浮、熔、游、响、红）',
    equation: '2\\,\\text{Na} + 2\\,\\text{H}_2\\text{O} \\;\\longrightarrow\\; 2\\,\\text{NaOH} + \\text{H}_2\\uparrow',
    reactantLabel: '2Na+2H₂O', productLabel: '2NaOH+H₂',
    deltaH: -1, activation: 0.4,
    reactants: [{ species: 'Na', count: 2 }, { species: 'H2O', count: 2 }],
    products: [{ species: 'NaOH', count: 2 }, { species: 'H2', count: 1 }],
    steps: [
      ['反应物接触', '钠浮在水面上并熔成小球。钠的密度比水小、熔点低，反应放热足以使其熔化。'],
      ['O–H 键断裂', '水分子中的一个 O–H 键断裂，钠失去电子成为 Na⁺，氢离子得到电子结合成 H₂。'],
      ['生成氢氧化钠与氢气', '得到 2 个 NaOH 与 1 个 H₂。反应前后 Na 2、O 2、H 4，原子守恒。'],
    ],
  },
  {
    id: 'chem-neutralization',
    title: '酸碱中和',
    subtitle: 'HCl + NaOH → NaCl + H₂O（强酸强碱中和，放热 57.3 kJ/mol）',
    equation: '\\text{HCl} + \\text{NaOH} \\;\\longrightarrow\\; \\text{NaCl} + \\text{H}_2\\text{O}',
    reactantLabel: 'HCl+NaOH', productLabel: 'NaCl+H₂O',
    deltaH: -0.45, activation: 0.25,
    reactants: [{ species: 'HCl', count: 1 }, { species: 'NaOH', count: 1 }],
    products: [{ species: 'NaCl', count: 1 }, { species: 'H2O', count: 1 }],
    steps: [
      ['溶液中电离', '盐酸与氢氧化钠在水中分别电离成 H⁺、Cl⁻ 与 Na⁺、OH⁻（此处用分子外形简化表示）。'],
      ['H⁺ 与 OH⁻ 结合', '真正发生的是 H⁺ + OH⁻ → H₂O，其余离子只是「旁观离子」，没有参与反应。'],
      ['生成盐和水', 'Na⁺ 与 Cl⁻ 结合成 NaCl，H 与 OH 组成 H₂O。反应前后各元素原子数不变。'],
    ],
  },
  {
    id: 'chem-lab-co2',
    title: '实验室制取二氧化碳',
    subtitle: 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑（固液不加热型）',
    equation: '\\text{CaCO}_3 + 2\\,\\text{HCl} \\;\\longrightarrow\\; \\text{CaCl}_2 + \\text{H}_2\\text{O} + \\text{CO}_2\\uparrow',
    reactantLabel: 'CaCO₃+2HCl', productLabel: 'CaCl₂+H₂O+CO₂',
    deltaH: -0.3, activation: 0.35,
    reactants: [{ species: 'CaCO3', count: 1 }, { species: 'HCl', count: 2 }],
    products: [{ species: 'CaCl2', count: 1 }, { species: 'H2O', count: 1 }, { species: 'CO2', count: 1 }],
    steps: [
      ['反应物接触', '大理石（碳酸钙）与稀盐酸接触，固体表面产生气泡。'],
      ['碳酸根被破坏', 'H⁺ 与 CO₃²⁻ 反应，C–O 键断裂，生成不稳定的 H₂CO₃，随即分解为 H₂O 与 CO₂。'],
      ['生成氯化钙、水和二氧化碳', '得到 CaCl₂、H₂O 与 CO₂。反应前后 Ca 1、C 1、O 3、H 2、Cl 2，原子守恒。'],
    ],
  },
  {
    id: 'chem-caco3-decomposition',
    title: '碳酸钙的高温分解',
    subtitle: 'CaCO₃ → CaO + CO₂↑（高温煅烧，吸热 178 kJ/mol）',
    equation: '\\text{CaCO}_3 \\;\\xrightarrow{\\text{高温}}\\; \\text{CaO} + \\text{CO}_2\\uparrow',
    reactantLabel: 'CaCO₃', productLabel: 'CaO+CO₂',
    deltaH: 0.75, activation: 0.9,
    reactants: [{ species: 'CaCO3', count: 1 }],
    products: [{ species: 'CaO', count: 1 }, { species: 'CO2', count: 1 }],
    steps: [
      ['高温加热', '碳酸钙在 900 ℃ 以上分解。这是吸热反应，需要持续供热。'],
      ['C–O 键断裂', '碳酸根中的一根 C–O 键断裂，CO₂ 逸出，剩下的氧留给钙。'],
      ['生成氧化钙与二氧化碳', '得到 CaO（生石灰）与 CO₂。反应前后 Ca 1、C 1、O 3，原子守恒。'],
    ],
  },
];

// —————————— 布局与装配 ——————————

const SPECIES_GAP_X = 0.55;
const SPECIES_GAP_Y = 0.55;
const MAX_ROW_WIDTH = 6.4;

function speciesBounds(species) {
  const pts = SPECIES[species].atoms.map((a) => a[2]);
  return {
    minX: Math.min(...pts.map((p) => p[0])),
    maxX: Math.max(...pts.map((p) => p[0])),
    minY: Math.min(...pts.map((p) => p[1])),
    maxY: Math.max(...pts.map((p) => p[1])),
  };
}

function speciesRadius(species) {
  return SPECIES[species].atoms.reduce((m, atom) => Math.max(m, ELEMENTS[atom[1]].radius), 0.3);
}

function buildInstances(entries) {
  const instances = [];
  for (const entry of entries) {
    const b = speciesBounds(entry.species);
    // 间距按「几何范围 + 原子半径」算，扁平分子也要给一个最小高度，
    // 否则排成两行时会上下贴在一起。
    const pad = 2 * speciesRadius(entry.species);
    const w = b.maxX - b.minX + pad;
    const h = Math.max(b.maxY - b.minY + pad, 1.5);
    for (let i = 0; i < (entry.count || 1); i += 1) {
      instances.push({
        species: entry.species,
        index: i,
        width: w,
        height: h,
        centerLocal: [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2],
      });
    }
  }
  return instances;
}

// 把一组分子排成若干行，返回每个实例的中心坐标与整块尺寸
function layoutBlock(instances) {
  const rows = [];
  let row = [];
  let rowWidth = 0;
  for (const inst of instances) {
    const nextWidth = rowWidth + (row.length ? SPECIES_GAP_X : 0) + inst.width;
    if (row.length && nextWidth > MAX_ROW_WIDTH) {
      rows.push({ items: row, width: rowWidth, height: Math.max(...row.map((r) => r.height)) });
      row = [];
      rowWidth = 0;
    }
    rowWidth += (row.length ? SPECIES_GAP_X : 0) + inst.width;
    row.push(inst);
  }
  if (row.length) rows.push({ items: row, width: rowWidth, height: Math.max(...row.map((r) => r.height)) });

  const totalHeight = rows.reduce((s, r) => s + r.height, 0) + SPECIES_GAP_Y * (rows.length - 1);
  let y = totalHeight / 2;
  for (const r of rows) {
    y -= r.height / 2;
    let x = -r.width / 2;
    for (const inst of r.items) {
      inst.centerWorld = [x + inst.width / 2, y];
      x += inst.width + SPECIES_GAP_X;
    }
    y -= r.height / 2 + SPECIES_GAP_Y;
  }
  return { width: Math.max(...rows.map((r) => r.width)), height: totalHeight };
}

function placeInstances(instances, offsetX) {
  for (const inst of instances) {
    const [cx, cy] = inst.centerWorld;
    inst.origin = [cx + offsetX - inst.centerLocal[0], cy - inst.centerLocal[1]];
  }
}

function atomsOfInstance(inst) {
  return SPECIES[inst.species].atoms.map(([localId, el, pos]) => ({
    localId,
    el,
    pos: [pos[0] + inst.origin[0], pos[1] + inst.origin[1], pos[2]],
    instance: inst,
  }));
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function buildLesson(reaction) {
  const reactantInstances = buildInstances(reaction.reactants);
  const productInstances = buildInstances(reaction.products);

  // 反应物与产物都用同一块中心区域：这样 t=0 和 t=1 都占满画面，
  // 形变更像"就地重组"，而不是从左边一路飞到右边。
  const reactantBlock = layoutBlock(reactantInstances);
  const productBlock = layoutBlock(productInstances);

  placeInstances(reactantInstances, 0);
  placeInstances(productInstances, 0);

  const reactantAtoms = reactantInstances.flatMap(atomsOfInstance);
  const productAtoms = productInstances.flatMap(atomsOfInstance);

  // 同元素最近邻配对：保证原子守恒，且迁移距离最短
  const used = new Set();
  for (const product of productAtoms) {
    let best = null;
    let bestDist = Infinity;
    for (const source of reactantAtoms) {
      if (used.has(source) || source.el !== product.el) continue;
      const d = distance(source.pos, product.pos);
      if (d < bestDist) {
        bestDist = d;
        best = source;
      }
    }
    if (!best) throw new Error(`${reaction.id}: 元素 ${product.el} 数量不守恒`);
    used.add(best);
    best.end = product.pos;
    best.productInstance = product.instance;
    best.productLocalId = product.localId;
  }
  if (used.size !== reactantAtoms.length) {
    throw new Error(`${reaction.id}: 产物原子少于反应物`);
  }

  // 编号：按元素分组，C1..、O1..
  const counters = {};
  const sorted = [...reactantAtoms].sort((a, b) => {
    if (a.el !== b.el) return a.el < b.el ? -1 : 1;
    return a.pos[1] === b.pos[1] ? a.pos[0] - b.pos[0] : b.pos[1] - a.pos[1];
  });
  const atoms = sorted.map((atom) => {
    counters[atom.el] = (counters[atom.el] || 0) + 1;
    const id = `${atom.el}${counters[atom.el]}`;
    atom.id = id;
    return {
      id,
      el: atom.el,
      color: ELEMENTS[atom.el].color,
      radius: ELEMENTS[atom.el].radius,
      start: atom.pos.map((n) => Math.round(n * 1000) / 1000),
      end: atom.end.map((n) => Math.round(n * 1000) / 1000),
      rmol: `${atom.instance.species}#${atom.instance.index + 1}`,
      pmol: `${atom.productInstance.species}#${atom.productInstance.index + 1}`,
    };
  });

  const byInstanceAtom = new Map();
  for (const atom of reactantAtoms) {
    byInstanceAtom.set(`${atom.instance.species}#${atom.instance.index}|${atom.localId}`, atom.id);
  }
  const byProductAtom = new Map();
  for (const atom of reactantAtoms) {
    byProductAtom.set(`${atom.productInstance.species}#${atom.productInstance.index}|${atom.productLocalId}`, atom.id);
  }

  const bondList = (instances, lookup) => instances.flatMap((inst) => {
    const def = SPECIES[inst.species];
    return def.bonds.map(([a, b, order]) => ({
      a: lookup.get(`${inst.species}#${inst.index}|${def.atoms[a][0]}`),
      b: lookup.get(`${inst.species}#${inst.index}|${def.atoms[b][0]}`),
      order,
    }));
  });

  const before = bondList(reactantInstances, byInstanceAtom);
  const after = bondList(productInstances, byProductAtom);

  const elementCounts = {};
  for (const atom of atoms) elementCounts[atom.el] = (elementCounts[atom.el] || 0) + 1;

  const labels = [
    ...reactantInstances.map((inst) => ({
      id: `reactant-${inst.species}#${inst.index + 1}`,
      text: `${NAME[inst.species]} (${FORMULA[inst.species]})`,
      color: CAPTION_COLOR[inst.species],
      phase: 'reactant',
      atoms: reactantAtoms.filter((a) => a.instance === inst).map((a) => a.id),
    })),
    ...productInstances.map((inst) => ({
      id: `product-${inst.species}#${inst.index + 1}`,
      text: `${NAME[inst.species]} (${FORMULA[inst.species]})`,
      color: CAPTION_COLOR[inst.species],
      phase: 'product',
      atoms: reactantAtoms.filter((a) => a.productInstance === inst).map((a) => a.id),
    })),
  ];

  const legend = Object.entries(elementCounts)
    .filter(([el]) => el in ELEMENTS)
    .map(([el]) => ({ el, color: ELEMENTS[el].color, name: ELEMENTS[el].name }));

  const steps = reaction.steps.map(([title, html], i) => ({
    title: `${i + 1}. ${title}`,
    html,
  }));

  return {
    id: reaction.id,
    kind: 'edulab.chemReaction',
    schema: 'edulab@0.1.8',
    sourceSkill: 'edu-chem-reaction',
    title: reaction.title,
    tags: ['chemistry', 'reaction'],
    payload: {
      meta: {
        title: reaction.title,
        subtitle: reaction.subtitle,
        language: 'zh-CN',
        category: 'junior',
        accent: 'amber',
        engine: 'morph',
        equation: reaction.equation,
      },
      conditions: { text: reaction.conditions || '', exothermic: reaction.deltaH < 0, flame: false },
      // 现实意义：渲染在标题下方的高亮块
      context: REAL_WORLD[reaction.id] || '',
      atoms,
      bonds: { before, after, broken: before, formed: after, kept: [] },
      labels,
      elementCounts,
      legend,
      steps,
      fragments: [],
      energy: {
        activation: reaction.activation,
        deltaH: reaction.deltaH,
        reactantLabel: reaction.reactantLabel,
        productLabel: reaction.productLabel,
      },
      electrons: [],
      ui: {
        reactants: '反应物', products: '产物', progress: '反应进度',
        play: '自动演示', pause: '暂停演示', reset: '复位',
        prev: '上一步', next: '下一步',
        hint: '拖动滑块观察化学键的断裂、原子重组与守恒，或点击上方步骤跳转。',
        drag: '拖拽旋转 · 滚轮缩放 · 右键平移',
        legend: '原子图例', conservation: '原子守恒',
        energy: '能量·反应进程', broken: '断裂的键', formed: '新生成的键',
        labels: '标签', labelsHint: '显示 / 隐藏分子标签',
      },
    },
  };
}

export function buildExtraChemLessons() {
  return REACTIONS.map(buildLesson);
}

export const EXTRA_CHEM_IDS = REACTIONS.map((r) => r.id);

// 统一场景配色来源。
// three.js 的 Color/Material 只能吃十六进制数值，无法直接读取 CSS 变量，
// 所以这里作为 JS 侧唯一的调色来源，数值与 src/style.css 中的 CSS 变量保持同步。
// 任何新增的 3D 场景/2D canvas 绘制都应从这里取色，不再各自硬编码。

// 对应 --bg-canvas（#f5f4ed），所有 three.js 场景背景统一取这个值。
export const SCENE_BG = 0xf5f4ed;

// 对应 --accent / --accent-hover
export const ACCENT = 0xd97757;
export const ACCENT_HOVER = 0xc2613f;

// 对应 --text-primary
export const TEXT_PRIMARY = 0x3d3929;

// 解析几何等 2D canvas 场景使用的辅助配色。
// 复用 layout.js 中已有的元素分类配色体系，避免另起一套无关色板导致整体风格割裂。
// 键名覆盖 src/data/edulab/generated/analytic-*.json 中出现过的全部语义色名
// （area/aux/curve/fixed/given/line/line2/point/ptA/ptB/vecA/vecB），
// 缺失键名会导致对应几何元素（曲线/点/直线/向量等）用无效颜色字符串绘制，视觉上"消失"。
export const ANALYTIC_PALETTE = {
  curve: '#d97757',    // accent（碱金属同色系），主圆锥曲线
  curve2: '#8264b8',   // metalloid 紫，与化学键三键配色一致，次曲线
  line: '#4e8ec2',     // post-transition metal 蓝，动直线
  line2: '#2f8f9d',    // 辅助直线/弦
  point: '#3d3929',    // text-primary，一般点
  fixed: '#5ea05e',    // transition metal 绿，固定点/不随参数变化的对象
  given: '#8264b8',    // 题目给定的已知点
  ptA: '#d24b45',      // 交点 A
  ptB: '#2f6fb0',      // 交点 B
  vecA: '#d24b45',     // 向量 A（与 ptA 呼应）
  vecB: '#2f6fb0',     // 向量 B（与 ptB 呼应）
  area: 'rgba(217,119,87,0.18)', // 多边形/三角形填充
  aux: '#a8a596',      // 辅助线段
  locus: '#c85858',    // actinide 红，轨迹曲线
};

// Standard periodic table grid positions
// Lanthanides (57-71) and Actinides (89-103) go to separate rows below
const LANTHANIDE_START = 57, LANTHANIDE_END = 71;
const ACTINIDE_START = 89, ACTINIDE_END = 103;

function getStandardCol(el) {
  if (el.z >= LANTHANIDE_START && el.z <= LANTHANIDE_END) return 3 + (el.z - LANTHANIDE_START);
  if (el.z >= ACTINIDE_START && el.z <= ACTINIDE_END) return 3 + (el.z - ACTINIDE_START);
  return el.group;
}

function getStandardRow(el) {
  if (el.z >= LANTHANIDE_START && el.z <= LANTHANIDE_END) return 9;
  if (el.z >= ACTINIDE_START && el.z <= ACTINIDE_END) return 10;
  return el.period;
}

const S = 2.2; // grid spacing

export function flatLayout(el) {
  const col = getStandardCol(el);
  const row = getStandardRow(el);
  return [(col - 1) * S, -(row - 1) * S, 0];
}

// Claude 浅色主题适配的分类配色（柔和，适合浅色背景）
export const CATEGORY_COLORS = {
  'alkali metal':          '#e07760',
  'alkaline earth metal':  '#e0954a',
  'transition metal':      '#5ea05e',
  'post-transition metal': '#4e8ec2',
  'metalloid':             '#8264b8',
  'nonmetal':              '#c9a83c',
  'noble gas':             '#b060aa',
  'lanthanide':            '#3da690',
  'actinide':              '#c85858',
  'unknown':               '#8c8a7c',
};

// 分类中文名
export const CATEGORY_NAMES_ZH = {
  'alkali metal':          '碱金属',
  'alkaline earth metal':  '碱土金属',
  'transition metal':      '过渡金属',
  'post-transition metal': '后过渡金属',
  'metalloid':             '准金属',
  'nonmetal':              '非金属',
  'noble gas':             '稀有气体',
  'lanthanide':            '镧系元素',
  'actinide':              '锕系元素',
  'unknown':               '未知',
};

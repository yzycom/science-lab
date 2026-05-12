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

const S = 2.2; // spacing

export function flatLayout(el) {
  const col = getStandardCol(el);
  const row = getStandardRow(el);
  return [(col - 1) * S, -(row - 1) * S, 0];
}

export function terrainLayout(el) {
  const [x, y] = flatLayout(el);
  const z = (el.radius || 100) * 0.015;
  return [x, y, z];
}

export function spiralLayout(el) {
  const t = el.z * 0.18;
  const r = 4 + t * 0.55;
  return [r * Math.cos(t), el.z * 0.18, r * Math.sin(t)];
}

export const CATEGORY_COLORS = {
  'alkali metal':           '#ff6b6b',
  'alkaline earth metal':   '#ffa94d',
  'transition metal':       '#51cf66',
  'post-transition metal':  '#74c0fc',
  'metalloid':              '#b197fc',
  'nonmetal':               '#ffd43b',
  'noble gas':              '#da77f2',
  'lanthanide':             '#38d9a9',
  'actinide':               '#ff8787',
  'unknown':                '#868e96',
};

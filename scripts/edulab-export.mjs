import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { applyStructureOverrides } from './edulab-structure-overrides.mjs';

const require = createRequire(import.meta.url);
const EDULAB_ROOT = dirname(require.resolve('@wy51ai/edulab/package.json'));
const OUT_DIR = new URL('../src/data/edulab/generated/', import.meta.url);
const SCHEMA = 'edulab@0.1.8';

const PYTHON_EXPORTER = String.raw`
import json
import sys
from pathlib import Path

skill_dir = Path(sys.argv[1])
source_skill = sys.argv[2]
key = sys.argv[3]
sys.path.insert(0, str(skill_dir / "scripts"))
sys.path.insert(0, str(skill_dir / "lib"))

import generate

if source_skill == "edu-chem-reaction":
    import reaction_kernel as K
    data = K.assemble_data(generate.REGISTRY[key]())
elif source_skill == "edu-analytic-geometry":
    data = generate.REGISTRY[key]()
elif source_skill == "edu-solid-geometry":
    data = generate.PROBLEMS[key]()
    data.pop("_answer", None)
else:
    raise RuntimeError(f"Unsupported source skill: {source_skill}")

print(json.dumps(data, ensure_ascii=False))
`;

const LESSONS = [
  {
    idPrefix: 'chem',
    sourceSkill: 'edu-chem-reaction',
    kind: 'edulab.chemReaction',
    skillPath: 'skills/edu-chem-reaction',
    keys: ['combustion_ch4', 'combustion_h2', 'electrolysis_water', 'redox_na_cl2', 'esterification', 'glucose_combustion'],
    titleOf: (payload) => payload.meta?.title,
    tags: ['chemistry', 'reaction'],
  },
  {
    idPrefix: 'solid',
    sourceSkill: 'edu-solid-geometry',
    kind: 'edulab.solidGeometry',
    skillPath: 'skills/edu-solid-geometry',
    keys: ['pyramid', 'cube', 'box'],
    titleOf: (payload) => payload.lesson?.title,
    tags: ['math', 'solid-geometry'],
  },
  {
    idPrefix: 'analytic',
    sourceSkill: 'edu-analytic-geometry',
    kind: 'edulab.analyticGeometry',
    skillPath: 'skills/edu-analytic-geometry',
    keys: ['ellipse_dot_range', 'ellipse_chord_range', 'ellipse_area_max', 'ellipse_slopeprod_const', 'parabola_dot_const', 'hyperbola_ecc_range'],
    titleOf: (payload) => payload.lesson?.title,
    tags: ['math', 'analytic-geometry'],
  },
];

const command = process.argv[2] || 'all';

if (command === 'list') {
  LESSONS.forEach((group) => {
    console.log(`${group.sourceSkill}: ${group.keys.join(', ')}`);
  });
  process.exit(0);
}

if (command !== 'all') {
  throw new Error(`Unknown command "${command}". Use "list" or "all".`);
}

assertPythonDependency();
mkdirSync(OUT_DIR, { recursive: true });

// 只删除本次会被重新生成的文件。此前是整个目录 rmSync，会把仓库里手工维护、
// 不经由 edulab 导出的课程（如 astro-lagrange-sun-earth.json）一起删掉。
const planned = new Set(
  LESSONS.flatMap((group) => group.keys.map((key) => `${group.idPrefix}-${key.replaceAll('_', '-')}.json`)),
);
for (const file of readdirSync(OUT_DIR)) {
  if (planned.has(file)) rmSync(join(OUT_DIR.pathname, file), { force: true });
}

const written = [];
for (const group of LESSONS) {
  for (const key of group.keys) {
    const payload = loadPayload(group, key);
    const envelope = {
      id: `${group.idPrefix}-${key.replaceAll('_', '-')}`,
      kind: group.kind,
      schema: SCHEMA,
      sourceSkill: group.sourceSkill,
      title: group.titleOf(payload) || key,
      tags: group.tags,
      payload,
    };
    const fileName = `${envelope.id}.json`;
    // 上游生成器在个别分子上给出的几何不成立（见 edulab-structure-overrides.mjs），
    // 这里统一过一层仓库自有的修正，保证重新导出不会把修正冲掉。
    const finalEnvelope = applyStructureOverrides(envelope);
    writeFileSync(new URL(fileName, OUT_DIR), `${JSON.stringify(finalEnvelope, null, 2)}\n`, 'utf8');
    written.push(fileName);
  }
}

console.log(`Exported ${written.length} Edulab lessons to ${OUT_DIR.pathname}`);
written.forEach((file) => console.log(`- ${file}`));

function assertPythonDependency() {
  const result = spawnSync('python3', ['-B', '-c', 'import sympy; print(sympy.__version__)'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error('Edulab export requires python3 with sympy. Install sympy or switch python3 before running this script.');
  }
}

function loadPayload(group, key) {
  const skillDir = join(EDULAB_ROOT, group.skillPath);
  const result = spawnSync('python3', ['-B', '-c', PYTHON_EXPORTER, skillDir, group.sourceSkill, key], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });
  if (result.status !== 0) {
    throw new Error(`Failed to export ${group.sourceSkill}/${key}:\n${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout);
}

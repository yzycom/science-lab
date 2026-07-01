import { describe, expect, test } from 'vitest';
import { renderChemReactionLesson } from './renderers/ChemReactionRenderer.js';
import { renderSolidGeometryLesson } from './renderers/SolidGeometryRenderer.js';
import { renderAnalyticGeometryLesson } from './renderers/AnalyticGeometryRenderer.js';

function mount() {
  const el = document.createElement('div');
  el.style.width = '800px';
  el.style.height = '600px';
  document.body.appendChild(el);
  return el;
}

describe('Edulab native renderers', () => {
  test('chemistry renderer creates a progress control and conservation chips', () => {
    const root = mount();
    const controller = renderChemReactionLesson(root, {
      meta: { title: '甲烷的燃烧', subtitle: 'CH4 + O2' },
      atoms: [
        { id: 'C1', el: 'C', color: '#333333', radius: 0.5, start: [-1, 0, 0], end: [1, 0, 0] },
        { id: 'O1', el: 'O', color: '#ff0000', radius: 0.4, start: [1, 0, 0], end: [-1, 0, 0] },
      ],
      bonds: { before: [{ a: 'C1', b: 'O1', order: 1 }], after: [], broken: [], formed: [], kept: [] },
      elementCounts: { C: 1, O: 1 },
      steps: [{ title: '混合', html: '反应物混合' }],
    });

    expect(root.querySelector('canvas')).toBeTruthy();
    expect(root.querySelector('[data-edulab-progress]')).toBeTruthy();
    expect(root.textContent).toContain('C: 1');
    controller.destroy();
  });

  test('solid geometry renderer creates a 3D scene and step controls', () => {
    const root = mount();
    const controller = renderSolidGeometryLesson(root, {
      lesson: { title: '正方体线面角', answerValue: '$1$' },
      steps: [{ title: '建系', content: '<p>建立坐标系</p>', highlight: ['Axis'] }],
      model: {
        points: { A: [0, 0, 0], B: [1, 0, 0], C: [0, 1, 0] },
        spheres: ['A', 'B', 'C'],
        edges: [{ a: 'A', b: 'B' }],
        elements: { Axis: { type: 'axes', size: 2 } },
        target: [0, 0, 0],
        initialCamera: [3, 3, 3],
      },
    });

    expect(root.querySelector('canvas')).toBeTruthy();
    expect(root.querySelector('[data-edulab-step]')).toBeTruthy();
    expect(root.textContent).toContain('正方体线面角');
    controller.destroy();
  });

  test('analytic geometry renderer creates a 2D board and parameter slider', () => {
    const root = mount();
    const controller = renderAnalyticGeometryLesson(root, {
      lesson: { title: '椭圆数量积', problem: '<p>求范围</p>', answer: '$[-3,1]$' },
      steps: [{ title: '联立', content: '<p>韦达</p>' }],
      board: {
        view: { xRange: [-3, 3], yRange: [-2, 2] },
        conics: [{ name: 'C', kind: 'ellipse', a: 2, b: 1, center: [0, 0] }],
        points: { M: [-1, 0] },
        param: { name: 'theta', label: 'θ', min: 0, max: 180, step: 1, value: 45 },
        derived: [],
        readouts: [{ id: 'theta', label: 'θ', type: 'expr', expr: 'theta' }],
        rangeBar: { of: 'theta', min: 0, max: 180, label: '$[0,180]$' },
      },
    });

    expect(root.querySelector('canvas')).toBeTruthy();
    expect(root.querySelector('[data-edulab-param]')).toBeTruthy();
    expect(root.textContent).toContain('椭圆数量积');
    controller.destroy();
  });
});

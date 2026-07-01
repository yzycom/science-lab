import { describe, expect, test } from 'vitest';
import { validateLessonEnvelope, groupLessonsByKind } from './lessonEnvelope.js';

describe('lesson envelope validation', () => {
  test('accepts a valid Edulab lesson envelope', () => {
    const envelope = {
      id: 'chem-combustion-ch4',
      kind: 'edulab.chemReaction',
      schema: 'edulab@0.1.8',
      sourceSkill: 'edu-chem-reaction',
      title: '甲烷的燃烧',
      tags: ['chemistry'],
      payload: { meta: { title: '甲烷的燃烧' } },
    };

    expect(validateLessonEnvelope(envelope)).toEqual(envelope);
  });

  test('rejects an unknown kind so new skills must be registered explicitly', () => {
    expect(() => validateLessonEnvelope({
      id: 'unknown',
      kind: 'edulab.physics',
      schema: 'edulab@0.1.8',
      sourceSkill: 'edu-physics',
      title: 'Physics',
      tags: [],
      payload: {},
    })).toThrow(/Unsupported Edulab lesson kind/);
  });

  test('groups lessons into stable runtime buckets', () => {
    const grouped = groupLessonsByKind([
      {
        id: 'chem',
        kind: 'edulab.chemReaction',
        schema: 'edulab@0.1.8',
        sourceSkill: 'edu-chem-reaction',
        title: 'Chem',
        tags: [],
        payload: {},
      },
      {
        id: 'solid',
        kind: 'edulab.solidGeometry',
        schema: 'edulab@0.1.8',
        sourceSkill: 'edu-solid-geometry',
        title: 'Solid',
        tags: [],
        payload: {},
      },
    ]);

    expect(grouped.chemReaction).toHaveLength(1);
    expect(grouped.solidGeometry).toHaveLength(1);
    expect(grouped.analyticGeometry).toHaveLength(0);
  });
});

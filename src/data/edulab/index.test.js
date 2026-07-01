import { describe, expect, test } from 'vitest';
import { edulabLessonGroups, edulabLessons } from './index.js';

describe('generated Edulab lesson registry', () => {
  test('loads all first-batch lessons', () => {
    expect(edulabLessons).toHaveLength(15);
    expect(edulabLessonGroups.chemReaction).toHaveLength(6);
    expect(edulabLessonGroups.solidGeometry).toHaveLength(3);
    expect(edulabLessonGroups.analyticGeometry).toHaveLength(6);
  });

  test('keeps every lesson on the pinned Edulab schema', () => {
    expect(new Set(edulabLessons.map((lesson) => lesson.schema))).toEqual(new Set(['edulab@0.1.8']));
  });
});

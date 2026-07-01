import { groupLessonsByKind, validateLessonEnvelope } from '../../edulab/lessonEnvelope.js';

const modules = import.meta.glob('./generated/*.json', {
  eager: true,
  import: 'default',
});

export const edulabLessons = Object.values(modules)
  .map(validateLessonEnvelope)
  .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));

export const edulabLessonGroups = groupLessonsByKind(edulabLessons);

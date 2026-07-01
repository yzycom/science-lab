import { LESSON_KINDS } from '../edulab/lessonEnvelope.js';
import { renderAnalyticGeometryLesson } from '../edulab/renderers/AnalyticGeometryRenderer.js';
import { renderChemReactionLesson } from '../edulab/renderers/ChemReactionRenderer.js';
import { renderSolidGeometryLesson } from '../edulab/renderers/SolidGeometryRenderer.js';

let activeRenderer = null;

export function renderLessonLibrary(lessons, onSelect) {
  const list = document.getElementById('lessonList');
  list.innerHTML = lessons.map((lesson, idx) => `
    <button class="lesson-item" data-id="${lesson.id}">
      <span class="lesson-kind">${labelKind(lesson.kind)}</span>
      <strong>${lesson.title}</strong>
      <span>${lesson.sourceSkill}</span>
    </button>
  `).join('');

  const items = [...list.querySelectorAll('.lesson-item')];
  items.forEach((item) => {
    item.addEventListener('click', () => {
      items.forEach((other) => other.classList.remove('active'));
      item.classList.add('active');
      const lesson = lessons.find((candidate) => candidate.id === item.dataset.id);
      if (lesson) onSelect(lesson);
    });
  });

  if (items.length > 0) {
    items[0].classList.add('active');
    onSelect(lessons[0]);
  }
}

export function renderLessonDetail(lesson) {
  const detail = document.getElementById('lessonDetail');
  if (activeRenderer) {
    activeRenderer.destroy();
    activeRenderer = null;
  }

  if (lesson.kind === LESSON_KINDS.chemReaction) {
    activeRenderer = renderChemReactionLesson(detail, lesson.payload);
  } else if (lesson.kind === LESSON_KINDS.solidGeometry) {
    activeRenderer = renderSolidGeometryLesson(detail, lesson.payload);
  } else if (lesson.kind === LESSON_KINDS.analyticGeometry) {
    activeRenderer = renderAnalyticGeometryLesson(detail, lesson.payload);
  }
}

export function clearLessonDetail() {
  if (activeRenderer) {
    activeRenderer.destroy();
    activeRenderer = null;
  }
  const detail = document.getElementById('lessonDetail');
  detail.innerHTML = '';
}

function labelKind(kind) {
  if (kind === LESSON_KINDS.chemReaction) return '化学反应';
  if (kind === LESSON_KINDS.solidGeometry) return '立体几何';
  if (kind === LESSON_KINDS.analyticGeometry) return '解析几何';
  return '课程';
}

export const EDULAB_SCHEMA = 'edulab@0.1.8';

export const LESSON_KINDS = Object.freeze({
  chemReaction: 'edulab.chemReaction',
  solidGeometry: 'edulab.solidGeometry',
  analyticGeometry: 'edulab.analyticGeometry',
});

export const KIND_TO_GROUP = Object.freeze({
  [LESSON_KINDS.chemReaction]: 'chemReaction',
  [LESSON_KINDS.solidGeometry]: 'solidGeometry',
  [LESSON_KINDS.analyticGeometry]: 'analyticGeometry',
});

export function validateLessonEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('Edulab lesson envelope must be an object');
  }

  const required = ['id', 'kind', 'schema', 'sourceSkill', 'title', 'tags', 'payload'];
  required.forEach((key) => {
    if (!(key in envelope)) {
      throw new Error(`Edulab lesson envelope missing ${key}`);
    }
  });

  if (!KIND_TO_GROUP[envelope.kind]) {
    throw new Error(`Unsupported Edulab lesson kind: ${envelope.kind}`);
  }

  if (envelope.schema !== EDULAB_SCHEMA) {
    throw new Error(`Unsupported Edulab schema: ${envelope.schema}`);
  }

  if (!Array.isArray(envelope.tags)) {
    throw new Error('Edulab lesson tags must be an array');
  }

  return envelope;
}

export function groupLessonsByKind(lessons) {
  const grouped = {
    chemReaction: [],
    solidGeometry: [],
    analyticGeometry: [],
  };

  lessons.forEach((lesson) => {
    const valid = validateLessonEnvelope(lesson);
    grouped[KIND_TO_GROUP[valid.kind]].push(valid);
  });

  return grouped;
}

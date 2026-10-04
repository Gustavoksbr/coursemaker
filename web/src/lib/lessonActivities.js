import { BLOCK_TYPE } from '@/lib/constants'

/**
 * What a lesson contains, derived from its blocks - the creator never picks an icon.
 *
 * `activity` wins over everything: a lesson with a question or a code exercise is something to DO,
 * even if it also has text and video. Otherwise a video block makes it `video`, else it is `reading`.
 */
export function lessonKind(blocks = []) {
  if (blocks.some((block) => block.type === BLOCK_TYPE.QUESTION || block.type === BLOCK_TYPE.CODE_EXERCISE)) {
    return 'activity'
  }
  if (blocks.some((block) => block.type === BLOCK_TYPE.VIDEO)) return 'video'
  return 'reading'
}

/** The title a code exercise carries in its public content, or null. */
export function exerciseTitle(block) {
  try {
    return JSON.parse(block.content ?? '{}').title || null
  } catch {
    return null
  }
}

/**
 * Every activity (question or code exercise) of a lesson, in lesson order, with a display title:
 * the exercise's own title, or "Questao 2 de 3" counted among that lesson's questions.
 */
export function lessonActivities(lesson) {
  const blocks = lesson.blocks ?? []
  const questionCount = blocks.filter((block) => block.type === BLOCK_TYPE.QUESTION).length
  let questionNumber = 0

  const activities = []
  for (const block of blocks) {
    if (block.type === BLOCK_TYPE.CODE_EXERCISE) {
      activities.push({
        blockId: block.id,
        lessonId: lesson.id,
        kind: 'exercise',
        title: exerciseTitle(block) ?? 'Exercicio de codigo',
      })
    } else if (block.type === BLOCK_TYPE.QUESTION) {
      questionNumber += 1
      activities.push({
        blockId: block.id,
        lessonId: lesson.id,
        kind: 'question',
        title: questionCount > 1 ? `Questao ${questionNumber} de ${questionCount}` : 'Questao',
      })
    }
  }
  return activities
}

/** Whether one activity is already done, from the two id sets the course detail carries. */
export function isActivityDone(activity, answeredQuestionBlockIds, passedExerciseBlockIds) {
  const done = activity.kind === 'exercise' ? passedExerciseBlockIds : answeredQuestionBlockIds
  return Boolean(done?.has(activity.blockId))
}

/** `{ done, total }` for one lesson. */
export function lessonActivityCounts(lesson, answeredQuestionBlockIds, passedExerciseBlockIds) {
  const activities = lessonActivities(lesson)
  const done = activities.filter((activity) =>
    isActivityDone(activity, answeredQuestionBlockIds, passedExerciseBlockIds),
  ).length
  return { done, total: activities.length }
}

/** Activities of the whole course, grouped by module (modules without any are left out). */
export function courseActivitiesByModule(modules, answeredQuestionBlockIds, passedExerciseBlockIds) {
  return (modules ?? [])
    .map((module, moduleIndex) => ({
      moduleId: module.id,
      moduleTitle: module.title,
      moduleNumber: moduleIndex + 1,
      items: module.lessons.flatMap((lesson) =>
        lessonActivities(lesson).map((activity) => ({
          ...activity,
          lessonTitle: lesson.title,
          done: isActivityDone(activity, answeredQuestionBlockIds, passedExerciseBlockIds),
        })),
      ),
    }))
    .filter((group) => group.items.length > 0)
}

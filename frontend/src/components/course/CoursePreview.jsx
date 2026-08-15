import { useEffect, useState } from 'react'
import { PreviewOverlay } from '@/components/shared/PreviewOverlay'
import { Landing, LessonView } from '@/pages/CourseViewPage'
import { flattenLessons } from '@/components/course/CurriculumNav'

/**
 * Owner-only preview of a course, built entirely from the editor's local draft: the settings form
 * (name/description/visibility/...) and the curriculum draft (modules/lessons/blocks), none of
 * which may have been saved yet. Reuses the same `Landing`/`LessonView` the real course page
 * renders, so the preview looks exactly like what publishing would produce.
 */
export function CoursePreview({ course, landingDescription, modules, curriculumDraft, onClose }) {
  const [activeLessonId, setActiveLessonId] = useState(null)

  const lessons = flattenLessons(modules)
  const activeIndex = lessons.findIndex((lesson) => lesson.id === activeLessonId)
  const activeLesson = activeIndex >= 0 ? lessons[activeIndex] : null

  const detail = {
    landingDescription,
    modules,
    isOwner: true,
    canViewContent: true,
    requiresPassword: false,
    progress: null,
  }

  return (
    <PreviewOverlay onClose={onClose}>
      {activeLesson ? (
        <PreviewLesson
          course={course}
          lesson={activeLesson}
          lessons={lessons}
          activeIndex={activeIndex}
          curriculumDraft={curriculumDraft}
          onSelectLesson={setActiveLessonId}
        />
      ) : (
        <Landing
          detail={detail}
          course={course}
          lessons={lessons}
          currentUser={null}
          onSelectLesson={setActiveLessonId}
          onEnrollClick={() => {}}
          enrolling={false}
          onUnlockClick={() => {}}
          onSavedChange={() => {}}
        />
      )}
    </PreviewOverlay>
  )
}

/** Blocks are draft-only until the editor's "Salvar" flush, so they are read from the draft, not fetched fresh. */
function PreviewLesson({ course, lesson, lessons, activeIndex, curriculumDraft, onSelectLesson }) {
  const blockDraft = curriculumDraft.blocksDraftFor(lesson.id)

  // `blocksDraftFor(...).seed()` is idempotent per lesson (a no-op once that lesson's blocks are
  // already in the draft), so it's safe to call on every lesson switch without a cache layer.
  useEffect(() => {
    blockDraft.seed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id])

  const blocks = blockDraft.blocks

  return (
    <LessonView
      course={course}
      lesson={{ ...lesson, blocks: blocks ?? [] }}
      lessons={lessons}
      activeIndex={activeIndex}
      onSelectLesson={onSelectLesson}
      onBackToLanding={() => onSelectLesson(null)}
      sidebarOpen={false}
      onToggleSidebar={() => {}}
      onCompleteLesson={() => {}}
      canTrackProgress={false}
    />
  )
}

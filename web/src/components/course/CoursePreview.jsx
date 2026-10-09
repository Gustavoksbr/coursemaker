import { useEffect, useMemo, useState } from 'react'
import { PreviewOverlay } from '@/components/shared/PreviewOverlay'
import { CourseViewer, Landing } from '@/pages/CourseViewPage'
import { flattenLessons } from '@/components/course/CurriculumNav'

/**
 * Owner-only preview of a course, built entirely from the editor's local draft: the settings form
 * (name/description/visibility/...) and the curriculum draft (modules/lessons/blocks), none of
 * which may have been saved yet.
 *
 * It renders the very same `CourseViewer` the real course page uses (side menu, lesson view, bottom
 * navigation, landing page), so the preview always looks and behaves like what publishing would
 * produce - the only differences are the data source and that nothing counts as progress.
 */
export function CoursePreview({ course, landingDescription, modules, curriculumDraft, onClose }) {
  const [activeLessonId, setActiveLessonId] = useState(null)
  const [scrollTargetBlockId, setScrollTargetBlockId] = useState(null)

  // Blocks are draft-only until the editor's "Salvar" flush, so they come from the draft, not from the
  // server. Every lesson's blocks are loaded up front: the side menu shows each lesson's kind and
  // activities, and the "Concluir curso" check looks at the whole course. `seed()` is idempotent per
  // lesson (a no-op once that lesson is already in the draft).
  const lessonIds = modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)).join(',')
  useEffect(() => {
    if (!lessonIds) return
    lessonIds.split(',').forEach((lessonId) => curriculumDraft.blocksDraftFor(lessonId).seed())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonIds])

  const modulesWithBlocks = useMemo(
    () =>
      modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) => ({
          ...lesson,
          blocks: curriculumDraft.blocksDraftFor(lesson.id).blocks ?? [],
        })),
      })),
    // blocksDraftFor reads the draft state, which changes with `curriculumDraft`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modules, curriculumDraft],
  )
  const lessons = useMemo(() => flattenLessons(modulesWithBlocks), [modulesWithBlocks])

  const selectActivity = (activity) => {
    setScrollTargetBlockId(activity.blockId)
    setActiveLessonId(activity.lessonId)
  }

  const detail = {
    landingDescription,
    modules: modulesWithBlocks,
    isOwner: true,
    canViewContent: true,
    requiresPassword: false,
    progress: null,
  }

  return (
    <PreviewOverlay onClose={onClose}>
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
        <CourseViewer
          course={course}
          modules={modulesWithBlocks}
          lessons={lessons}
          activeLessonId={activeLessonId}
          onSelectLesson={setActiveLessonId}
          onSelectActivity={selectActivity}
          canViewContent
          scrollToBlockId={scrollTargetBlockId}
          onScrolledToBlock={() => setScrollTargetBlockId(null)}
          // Below the preview's own 3.5rem header instead of the site's navbar.
          stickyTop="top-14"
          stickyHeight="h-[calc(100vh-3.5rem)]"
          stickyMaxHeight="max-h-[calc(100vh-3.5rem)]"
          landing={
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
          }
        />
      </div>
    </PreviewOverlay>
  )
}

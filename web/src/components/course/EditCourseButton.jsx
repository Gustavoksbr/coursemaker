import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'

/**
 * "Editar curso", pinned to the screen for the course's owner on every page of the course (start page and
 * lessons alike), so editing is one tap away wherever they are reading. On a lesson it opens the editor already
 * on that lesson (`?lesson=`, which CourseEditorPage reads), so they land on exactly what they were looking at.
 *
 * Top right, just under the site's navbar (h-16): the bottom is taken by the lesson's "Proxima aula" bar, the AI
 * chat bubble and the toasts. Below `sm` it shrinks to a round icon so it never covers a lesson's text.
 */
export function EditCourseButton({ courseHref, lesson = null }) {
  const to = lesson ? `${courseHref}/edit?lesson=${lesson.id}` : `${courseHref}/edit`
  const hint = lesson ? `Editar curso - abre na aula "${lesson.title}"` : 'Editar curso'

  return (
    <Link
      to={to}
      title={hint}
      aria-label={hint}
      className="fixed right-3 top-[4.75rem] z-30 inline-flex h-10 w-10 items-center justify-center gap-2 rounded-full bg-brand-500 text-sm font-semibold text-brand-ink shadow-lg shadow-brand-900/40 transition-colors hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300 sm:right-5 sm:top-20 sm:w-auto sm:px-4"
    >
      <Pencil size={16} aria-hidden="true" />
      <span className="hidden sm:inline">Editar curso</span>
    </Link>
  )
}

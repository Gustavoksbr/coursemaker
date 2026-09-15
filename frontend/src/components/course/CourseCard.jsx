import { Link } from 'react-router-dom'
import { BookOpen, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ContentBadges } from '@/components/ui/Badge'
import { MaybeLink } from '@/components/ui/MaybeLink'
import { SaveToLibraryButton } from '@/components/library/SaveToLibraryButton'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { courseHref } from '@/lib/contentLinks'
import { plural } from '@/lib/format'

export function CourseCard({ course }) {
  const href = courseHref(course)

  return (
    <article className="card group flex flex-col overflow-hidden">
      <MaybeLink to={href} className="block" tabIndex={-1} aria-hidden="true">
        <Thumbnail src={course.thumbnailUrl} alt={course.name} />
      </MaybeLink>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <ContentBadges
          status={course.status}
          visibility={course.visibility}
          featured={course.featured}
          blockedByAdmin={course.blockedByAdmin}
          school={course.school}
        />

        <div className="flex-1">
          <h3 className="line-clamp-2 break-words font-bold leading-snug text-slate-100 group-hover:text-brand-400">
            <MaybeLink to={href}>{course.name}</MaybeLink>
          </h3>
          {course.description && (
            <p className="mt-1.5 line-clamp-2 text-sm text-slate-400">{course.description}</p>
          )}
        </div>

        {course.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {course.categories.slice(0, 3).map((category) => (
              <span key={category} className="badge max-w-full break-all bg-slate-700/60 text-slate-300">
                {category}
              </span>
            ))}
            {course.categories.length > 3 && (
              <span className="badge text-slate-500">+{course.categories.length - 3}</span>
            )}
          </div>
        )}

        <Link
          to={`/users/${course.owner.nickname}`}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200"
        >
          <Avatar src={course.owner.image} name={course.owner.name} size="sm" />
          <span className="truncate">{course.owner.name}</span>
        </Link>

        <div className="flex items-center justify-between border-t border-slate-700/70 pt-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1" title={plural(course.lessonCount, 'licao', 'licoes')}>
              <BookOpen size={13} /> {course.lessonCount}
            </span>
            <span
              className="inline-flex items-center gap-1"
              title={plural(course.enrollmentCount, 'aluno', 'alunos')}
            >
              <Users size={13} /> {course.enrollmentCount}
            </span>
          </div>
          <SaveToLibraryButton kind="course" contentId={course.id} saved={course.savedByMe} size="sm" />
        </div>
      </div>
    </article>
  )
}

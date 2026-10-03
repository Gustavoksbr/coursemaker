import { useQuery } from '@tanstack/react-query'
import { Link2 } from 'lucide-react'
import { CourseCard } from '@/components/course/CourseCard'
import { PostCard } from '@/components/post/PostCard'
import { listCourseRelated, listPostRelated, relatedKeys } from '@/api/related'

/**
 * "Relacionados" on a course or post page: curated only by that content's own owner, so linking
 * X to Y never makes Y's page show X back.
 */
export function RelatedItemsSection({ kind, contentId }) {
  const query = useQuery({
    queryKey: kind === 'course' ? relatedKeys.course(contentId, 0) : relatedKeys.post(contentId, 0),
    queryFn: () =>
      kind === 'course' ? listCourseRelated(contentId, 0, 12) : listPostRelated(contentId, 0, 12),
  })

  if (query.isPending || !query.data?.items.length) return null

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-100">
        <Link2 size={18} className="text-brand-400" /> Relacionados
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {query.data.items.map((related) =>
          related.course ? (
            <CourseCard key={related.id} course={related.course} />
          ) : (
            <PostCard key={related.id} post={related.post} />
          ),
        )}
      </div>
    </section>
  )
}

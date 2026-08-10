import { CourseCard } from '@/components/course/CourseCard'
import { PostCard } from '@/components/post/PostCard'
import { TrilhaCard } from '@/components/trilha/TrilhaCard'

/**
 * Renders a saved course/post/trilha. Each card already carries its own SaveToLibraryButton, which
 * opens the same folder-picker used everywhere else -- no extra "move" control needed here.
 */
export function LibraryItemCard({ item }) {
  if (item.course) return <CourseCard course={item.course} />
  if (item.post) return <PostCard post={item.post} />
  return <TrilhaCard trilha={item.trilha} />
}

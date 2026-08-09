import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, GraduationCap } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { SearchBar } from '@/components/search/SearchBar'
import { Spinner } from '@/components/ui/Feedback'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { useDebounce } from '@/hooks/useDebounce'
import { courseKeys, listCourses } from '@/api/courses'
import { listPosts, postKeys } from '@/api/posts'
import { cn } from '@/lib/cn'

const TABS = [
  { value: 'course', label: 'Cursos', icon: GraduationCap },
  { value: 'post', label: 'Posts', icon: BookOpen },
]

/**
 * Search-and-pick dialog for courses/posts, shared by the trilha item editor and the related-items
 * editor: both need "find a course or post and attach it", differing only in what happens on pick.
 */
export function PickContentModal({ open, onClose, onPick, excludeCourseIds = [], excludePostIds = [], title }) {
  const [tab, setTab] = useState('course')
  const [term, setTerm] = useState('')
  const debouncedTerm = useDebounce(term, 300)

  const query = { q: debouncedTerm, sort: 'recent', page: 0, size: 20 }

  const courseQuery = useQuery({
    queryKey: courseKeys.list(query),
    queryFn: () => listCourses(query),
    enabled: open && tab === 'course',
  })
  const postQuery = useQuery({
    queryKey: postKeys.list(query),
    queryFn: () => listPosts(query),
    enabled: open && tab === 'post',
  })

  const activeQuery = tab === 'course' ? courseQuery : postQuery
  const excluded = tab === 'course' ? excludeCourseIds : excludePostIds
  const items = (activeQuery.data?.items ?? []).filter((item) => !excluded.includes(item.id))

  const handlePick = (item) => {
    onPick(tab, item)
  }

  const handleClose = () => {
    setTerm('')
    setTab('course')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={title ?? 'Adicionar conteudo'} size="lg">
      <div className="space-y-4">
        <div className="flex gap-1 rounded-lg bg-slate-900 p-1">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors',
                tab === value ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200',
              )}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <SearchBar value={term} onChange={setTerm} placeholder="Buscar por titulo, autor ou categoria..." />

        <div className="max-h-96 space-y-1.5 overflow-y-auto">
          {activeQuery.isPending ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Nada encontrado.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePick(item)}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-700 p-2 text-left hover:border-brand-500 hover:bg-slate-800"
              >
                <Thumbnail
                  src={item.thumbnailUrl}
                  alt={item.name ?? item.title}
                  className="h-12 w-20 shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">{item.name ?? item.title}</p>
                  <p className="truncate text-xs text-slate-500">@{item.owner.nickname}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}

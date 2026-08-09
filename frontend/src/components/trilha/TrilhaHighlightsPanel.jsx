import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star, Waypoints } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Feedback'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { useToast } from '@/context/ToastContext'
import {
  getCourseTrilhas,
  getHighlightedCourseTrilhas,
  highlightCourseTrilha,
  trilhaKeys,
  unhighlightCourseTrilha,
} from '@/api/trilhas'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * Owner-only curation: of every trilha this course has been added to (by its own owner or by
 * anyone else, if it's public), pick which ones surface by default on the course's landing page.
 * This is what keeps a stranger from spamming the course page by trilha-ing it into a pile of
 * unrelated trilhas -- membership itself stays out of the course owner's control, only the
 * spotlight does.
 */
export function TrilhaHighlightsPanel({ courseId }) {
  const [page, setPage] = useState(0)
  const queryClient = useQueryClient()
  const toast = useToast()

  const allQuery = useQuery({
    queryKey: trilhaKeys.courseTrilhas(courseId, page),
    queryFn: () => getCourseTrilhas(courseId, page, 6),
  })
  const highlightedQuery = useQuery({
    queryKey: trilhaKeys.courseTrilhasHighlighted(courseId),
    queryFn: () => getHighlightedCourseTrilhas(courseId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trilhaKeys.courseTrilhasHighlighted(courseId) })
    queryClient.invalidateQueries({ queryKey: trilhaKeys.courseTrilhas(courseId, page) })
  }

  const { mutate: toggle, isPending: toggling } = useMutation({
    mutationFn: ({ trilhaId, highlighted }) =>
      highlighted ? unhighlightCourseTrilha(courseId, trilhaId) : highlightCourseTrilha(courseId, trilhaId),
    onSuccess: invalidate,
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel atualizar o destaque.')),
  })

  const highlightedIds = new Set((highlightedQuery.data ?? []).map((trilha) => trilha.id))

  return (
    <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
        <Waypoints size={15} /> Trilhas em destaque
      </h2>
      <p className="text-xs text-slate-500">
        Qualquer pessoa pode incluir um curso publico em suas proprias trilhas. Escolha aqui quais delas
        aparecem por padrao na pagina do curso -- as demais continuam visiveis em "ver mais".
      </p>

      {allQuery.isPending ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : allQuery.data.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-xs text-slate-500">
          Este curso ainda nao foi adicionado a nenhuma trilha.
        </p>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-1.5">
            {allQuery.data.items.map((trilha) => {
              const highlighted = highlightedIds.has(trilha.id)
              return (
                <li
                  key={trilha.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-700 p-2"
                >
                  <Thumbnail src={trilha.thumbnailUrl} alt={trilha.title} className="h-10 w-16 shrink-0 rounded" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">{trilha.title}</p>
                    <p className="truncate text-xs text-slate-500">por @{trilha.owner.nickname}</p>
                  </div>
                  <button
                    type="button"
                    disabled={toggling}
                    onClick={() => toggle({ trilhaId: trilha.id, highlighted })}
                    className={cn(
                      'shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      highlighted
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200',
                    )}
                  >
                    <Star size={13} className={cn('inline', highlighted && 'fill-current')} />{' '}
                    {highlighted ? 'Em destaque' : 'Destacar'}
                  </button>
                </li>
              )
            })}
          </ul>
          <Pagination page={allQuery.data.page} totalPages={allQuery.data.totalPages} onChange={setPage} />
        </div>
      )}
    </section>
  )
}

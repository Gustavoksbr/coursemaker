import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, Plus, Trash2 } from 'lucide-react'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { PickContentModal } from '@/components/shared/PickContentModal'
import { useToast } from '@/context/ToastContext'
import {
  addCourseRelated,
  addPostRelated,
  listCourseRelated,
  listPostRelated,
  relatedKeys,
  removeCourseRelated,
  removePostRelated,
} from '@/api/related'
import { errorMessage } from '@/lib/api'

/**
 * Owner-only management of "related" courses/posts, reused by both the course settings panel and
 * the post editor. Not shown to anyone else -- only the content's own owner curates this list.
 */
export function RelatedItemsEditor({ kind, contentId }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [pickerOpen, setPickerOpen] = useState(false)

  const queryKey = kind === 'course' ? relatedKeys.course(contentId, 0) : relatedKeys.post(contentId, 0)
  const query = useQuery({
    queryKey,
    queryFn: () => (kind === 'course' ? listCourseRelated(contentId, 0, 20) : listPostRelated(contentId, 0, 20)),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey })
  const onError = (fallback) => (error) => toast.error(errorMessage(error, fallback))

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: ({ type, item }) => {
      const payload = type === 'course' ? { relatedCourseId: item.id } : { relatedPostId: item.id }
      return kind === 'course' ? addCourseRelated(contentId, payload) : addPostRelated(contentId, payload)
    },
    onSuccess: () => {
      setPickerOpen(false)
      refresh()
    },
    onError: onError('Nao foi possivel relacionar este item.'),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (relatedItemId) =>
      kind === 'course' ? removeCourseRelated(contentId, relatedItemId) : removePostRelated(contentId, relatedItemId),
    onSuccess: refresh,
    onError: onError('Nao foi possivel remover o relacionado.'),
  })

  const items = query.data?.items ?? []
  const excludeCourseIds = [kind === 'course' ? contentId : null, ...items.filter((i) => i.course).map((i) => i.course.id)]
    .filter(Boolean)
  const excludePostIds = [kind === 'post' ? contentId : null, ...items.filter((i) => i.post).map((i) => i.post.id)]
    .filter(Boolean)

  return (
    <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
          <Link2 size={15} /> Relacionados
        </h2>
        <button type="button" onClick={() => setPickerOpen(true)} disabled={adding} className="btn-ghost px-2 py-1 text-xs">
          <Plus size={14} /> Adicionar
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Mostrado apenas por voce ter escolhido: relacionar aqui nao faz o outro curso/post mostrar
        este de volta.
      </p>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-center text-xs text-slate-500">
          Nenhum conteudo relacionado ainda.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((related) => {
            const content = related.course ?? related.post
            return (
              <li key={related.id} className="flex items-center gap-3 rounded-lg border border-slate-700 p-2">
                <Thumbnail src={content.thumbnailUrl} alt={content.name ?? content.title} className="h-10 w-16 shrink-0 rounded" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200">{content.name ?? content.title}</p>
                  <p className="truncate text-xs text-slate-500">{related.course ? 'Curso' : 'Post'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(related.id)}
                  className="shrink-0 rounded p-1.5 text-slate-500 hover:bg-slate-700 hover:text-red-400"
                  aria-label="Remover relacionado"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <PickContentModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(type, item) => add({ type, item })}
        excludeCourseIds={excludeCourseIds}
        excludePostIds={excludePostIds}
        title="Relacionar conteudo"
      />
    </section>
  )
}

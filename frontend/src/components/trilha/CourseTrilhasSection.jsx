import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Waypoints } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Feedback'
import { TrilhaCard } from '@/components/trilha/TrilhaCard'
import {
  getCourseTrilhas,
  getHighlightedCourseTrilhas,
  getPostTrilhas,
  trilhaKeys,
} from '@/api/trilhas'

/**
 * "Trilhas do curso": the course owner's curated highlights, plus a "ver mais" that pages through
 * every trilha containing the course (which anyone could have added, if it is public) -- this split
 * is what stops a stranger from spamming a course's landing page with unwanted trilhas.
 */
export function CourseTrilhasSection({ contentId, kind = 'course' }) {
  const [modalOpen, setModalOpen] = useState(false)

  const highlightedQuery = useQuery({
    queryKey: trilhaKeys.courseTrilhasHighlighted(contentId),
    queryFn: () => getHighlightedCourseTrilhas(contentId),
    enabled: kind === 'course',
  })

  // Posts have no curated highlight step (only courses can be trolled by strangers into many
  // trilhas the same way), so they just show the most recent ones directly.
  const postTrilhasQuery = useQuery({
    queryKey: trilhaKeys.postTrilhas(contentId, 0),
    queryFn: () => getPostTrilhas(contentId, 0, 6),
    enabled: kind === 'post',
  })

  const trilhas = kind === 'course' ? highlightedQuery.data : postTrilhasQuery.data?.items
  const isPending = kind === 'course' ? highlightedQuery.isPending : postTrilhasQuery.isPending

  if (isPending) return null
  if (!trilhas?.length) return null

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
          <Waypoints size={18} className="text-brand-400" /> {kind === 'course' ? 'Trilhas deste curso' : 'Trilhas deste post'}
        </h2>
        {kind === 'course' && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 text-sm font-medium text-brand-400 hover:text-brand-300"
          >
            Ver mais
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {trilhas.map((trilha) => (
          <TrilhaCard key={trilha.id} trilha={trilha} />
        ))}
      </div>

      {kind === 'course' && (
        <AllCourseTrilhasModal open={modalOpen} onClose={() => setModalOpen(false)} courseId={contentId} />
      )}
    </section>
  )
}

function AllCourseTrilhasModal({ open, onClose, courseId }) {
  const [page, setPage] = useState(0)

  const query = useQuery({
    queryKey: trilhaKeys.courseTrilhas(courseId, page),
    queryFn: () => getCourseTrilhas(courseId, page, 8),
    enabled: open,
  })

  return (
    <Modal open={open} onClose={onClose} title="Trilhas que incluem este curso" size="xl">
      {query.isPending ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : query.data.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Nenhuma trilha inclui este curso ainda.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {query.data.items.map((trilha) => (
              <TrilhaCard key={trilha.id} trilha={trilha} />
            ))}
          </div>
          <Pagination page={query.data.page} totalPages={query.data.totalPages} onChange={setPage} />
        </div>
      )}
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Waypoints } from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { CatalogFilters } from '@/components/search/CatalogFilters'
import { TrilhaCard } from '@/components/trilha/TrilhaCard'
import { CreateTrilhaModal } from '@/components/trilha/CreateTrilhaModal'
import { NicknameGateModal } from '@/components/auth/NicknameGateModal'
import { Pagination } from '@/components/ui/Pagination'
import { CardSkeletonGrid, EmptyState, ErrorState } from '@/components/ui/Feedback'
import { useAuth } from '@/context/AuthContext'
import { useCatalogFilters } from '@/hooks/useCatalogFilters'
import { useDebounce } from '@/hooks/useDebounce'
import { useNicknameGate } from '@/hooks/useNicknameGate'
import { listTrilhas, trilhaKeys } from '@/api/trilhas'
import { errorMessage } from '@/lib/api'
import { PAGE_SIZE } from '@/lib/constants'

export default function TrilhaListPage() {
  const { isAuthenticated } = useAuth()
  const [filters, setFilters] = useCatalogFilters()
  const [term, setTerm] = useState(filters.q)
  const [createOpen, setCreateOpen] = useState(false)
  const { requireNickname, nicknameModalProps } = useNicknameGate()
  const debouncedTerm = useDebounce(term, 300)

  useEffect(() => {
    if (debouncedTerm !== filters.q) {
      setFilters({ ...filters, q: debouncedTerm, page: 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm])

  const query = { ...filters, size: PAGE_SIZE }
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: trilhaKeys.list(query),
    queryFn: () => listTrilhas(query),
    placeholderData: (previous) => previous,
  })

  const categoryPoolQuery = { q: filters.q, author: filters.author, visibility: filters.visibility,
    sort: 'recent', page: 0, size: 100 }
  const { data: categoryPool } = useQuery({
    queryKey: trilhaKeys.list(categoryPoolQuery),
    queryFn: () => listTrilhas(categoryPoolQuery),
    staleTime: 60_000,
  })
  const availableCategories = [
    ...new Set(categoryPool?.items.flatMap((trilha) => trilha.categories ?? []) ?? []),
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
            <Waypoints className="text-brand-400" /> Trilhas
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {data ? `${data.totalItems} trilha(s) encontrada(s)` : 'Carregando trilhas...'}
          </p>
        </div>
        {isAuthenticated && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => requireNickname(() => setCreateOpen(true))}
          >
            <Plus size={16} /> Criar trilha
          </button>
        )}
      </div>

      <SearchBar
        value={term}
        onChange={setTerm}
        placeholder="Buscar por titulo, descricao, autor ou categoria..."
      />

      <CatalogFilters filters={filters} onChange={setFilters} availableCategories={availableCategories} />

      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} />
      ) : isPending ? (
        <CardSkeletonGrid count={6} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Waypoints}
          title="Nenhuma trilha encontrada"
          message="Ajuste os filtros ou tente outro termo de busca."
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((trilha) => (
              <TrilhaCard key={trilha.id} trilha={trilha} />
            ))}
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={(page) => {
              setFilters({ ...filters, page })
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="pt-4"
          />
        </>
      )}

      <CreateTrilhaModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <NicknameGateModal {...nicknameModalProps} />
    </div>
  )
}

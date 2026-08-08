import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, PenSquare } from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { CatalogFilters } from '@/components/search/CatalogFilters'
import { PostCard } from '@/components/post/PostCard'
import { NicknameGateModal } from '@/components/auth/NicknameGateModal'
import { Pagination } from '@/components/ui/Pagination'
import { CardSkeletonGrid, EmptyState, ErrorState } from '@/components/ui/Feedback'
import { useAuth } from '@/context/AuthContext'
import { useCatalogFilters } from '@/hooks/useCatalogFilters'
import { useDebounce } from '@/hooks/useDebounce'
import { useNicknameGate } from '@/hooks/useNicknameGate'
import { listPosts, postKeys } from '@/api/posts'
import { errorMessage } from '@/lib/api'
import { PAGE_SIZE } from '@/lib/constants'

export default function PostListPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [filters, setFilters] = useCatalogFilters()
  const [term, setTerm] = useState(filters.q)
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
    queryKey: postKeys.list(query),
    queryFn: () => listPosts(query),
    placeholderData: (previous) => previous,
  })

  // A second, wider query, deliberately without the category filter: the picker needs to keep
  // offering categories that would *broaden* the result set (an OR alternative), not just the ones
  // that survived the category filter already narrowing things down - otherwise, picking one
  // category makes every other one disappear from the list, which reads exactly like an AND filter.
  const categoryPoolQuery = { q: filters.q, author: filters.author, visibility: filters.visibility,
    sort: 'recent', page: 0, size: 100 }
  const { data: categoryPool } = useQuery({
    queryKey: postKeys.list(categoryPoolQuery),
    queryFn: () => listPosts(categoryPoolQuery),
    staleTime: 60_000,
  })
  const availableCategories = [
    ...new Set(categoryPool?.items.flatMap((post) => post.categories ?? []) ?? []),
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
            <BookOpen className="text-brand-400" /> Posts
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {data ? `${data.totalItems} post(s) encontrado(s)` : 'Carregando posts...'}
          </p>
        </div>
        {isAuthenticated && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => requireNickname(() => navigate('/posts/new'))}
          >
            <PenSquare size={16} /> Escrever post
          </button>
        )}
      </div>

      <SearchBar
        value={term}
        onChange={setTerm}
        placeholder="Buscar por titulo, descricao, autor ou categoria..."
      />

      <CatalogFilters
        filters={filters}
        onChange={setFilters}
        availableCategories={availableCategories}
      />

      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} />
      ) : isPending ? (
        <CardSkeletonGrid count={6} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhum post encontrado"
          message="Ajuste os filtros ou tente outro termo de busca."
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((post) => (
              <PostCard key={post.id} post={post} />
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

      <NicknameGateModal {...nicknameModalProps} />
    </div>
  )
}

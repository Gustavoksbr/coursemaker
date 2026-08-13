import { useNavigate } from 'react-router-dom'
import { BookOpen, PenSquare } from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { CatalogFilters } from '@/components/search/CatalogFilters'
import { PostCard } from '@/components/post/PostCard'
import { NicknameGateModal } from '@/components/auth/NicknameGateModal'
import { Pagination } from '@/components/ui/Pagination'
import { CardSkeletonGrid, EmptyState, ErrorState } from '@/components/ui/Feedback'
import { useAuth } from '@/context/AuthContext'
import { useCatalogFilters } from '@/hooks/useCatalogFilters'
import { useCatalogQuery } from '@/hooks/useCatalogQuery'
import { useNicknameGate } from '@/hooks/useNicknameGate'
import { listPosts, postKeys } from '@/api/posts'
import { errorMessage } from '@/lib/api'

export default function PostListPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [filters, setFilters] = useCatalogFilters()
  const { requireNickname, nicknameModalProps } = useNicknameGate()

  const { term, setTerm, data, isPending, isError, error, refetch, availableCategories } = useCatalogQuery({
    filters,
    setFilters,
    listFn: listPosts,
    queryKeyFn: postKeys.list,
  })

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
        <CardSkeletonGrid count={10} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhum post encontrado"
          message="Ajuste os filtros ou tente outro termo de busca."
        />
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
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

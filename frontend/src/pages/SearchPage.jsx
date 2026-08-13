import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, GraduationCap, Search as SearchIcon, Sparkles, Users, Waypoints } from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { SearchTabs } from '@/components/search/SearchTabs'
import { CatalogFilters } from '@/components/search/CatalogFilters'
import { CourseCard } from '@/components/course/CourseCard'
import { PostCard } from '@/components/post/PostCard'
import { TrilhaCard } from '@/components/trilha/TrilhaCard'
import { PersonCard } from '@/components/user/PersonCard'
import { Pagination } from '@/components/ui/Pagination'
import { CardSkeletonGrid, EmptyState, ErrorState } from '@/components/ui/Feedback'
import { useCatalogFilters } from '@/hooks/useCatalogFilters'
import { useCatalogList } from '@/hooks/useCatalogList'
import { useDebounce } from '@/hooks/useDebounce'
import { courseKeys, listCourses } from '@/api/courses'
import { postKeys, listPosts } from '@/api/posts'
import { trilhaKeys, listTrilhas } from '@/api/trilhas'
import { search as unifiedSearch, searchKeys, searchUsers, userKeys } from '@/api/users'
import { errorMessage } from '@/lib/api'
import { PAGE_SIZE } from '@/lib/constants'

const PREVIEW_SIZE = 6

const TABS = [
  { key: 'principais', label: 'Principais', icon: Sparkles },
  { key: 'cursos', label: 'Cursos', icon: GraduationCap },
  { key: 'posts', label: 'Posts', icon: BookOpen },
  { key: 'trilhas', label: 'Trilhas', icon: Waypoints },
  { key: 'pessoas', label: 'Pessoas', icon: Users },
]

export default function SearchPage() {
  const [filters, setFilters] = useCatalogFilters()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'principais'

  const [term, setTerm] = useState(filters.q)
  const debouncedTerm = useDebounce(term, 300)

  useEffect(() => {
    if (debouncedTerm !== filters.q) {
      setFilters({ ...filters, q: debouncedTerm, page: 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm])

  // Switching tabs keeps the search term but resets author/visibility/category/sort/page: those
  // four are shared URL state across the Cursos/Posts/Trilhas tabs (they all read the same
  // useCatalogFilters params), so without a reset a category picked on Cursos would silently get
  // reinterpreted as a Trilha category on the next tab.
  const changeTab = (nextTab) => {
    setSearchParams((current) => {
      const params = new URLSearchParams()
      const q = current.get('q')
      if (q) params.set('q', q)
      params.set('tab', nextTab)
      return params
    }, { replace: true })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
        <SearchIcon className="text-brand-400" /> Procurar
      </h1>

      <SearchBar
        value={term}
        onChange={setTerm}
        size="lg"
        placeholder="Buscar cursos, posts, trilhas, pessoas..."
      />

      <SearchTabs active={tab} onChange={changeTab} tabs={TABS} />

      {tab === 'principais' && <PrincipaisTab q={filters.q} onSeeAll={changeTab} />}
      {tab === 'cursos' && <CursosTab />}
      {tab === 'posts' && <PostsTab />}
      {tab === 'trilhas' && <TrilhasTab />}
      {tab === 'pessoas' && <PessoasTab q={filters.q} />}
    </div>
  )
}

function CatalogTab({ icon: Icon, emptyTitle, filters, setFilters, listFn, queryKeyFn, renderCard }) {
  const { data, isPending, isError, error, refetch, availableCategories } = useCatalogList({
    filters,
    listFn,
    queryKeyFn,
  })

  return (
    <div className="space-y-6">
      <CatalogFilters filters={filters} onChange={setFilters} availableCategories={availableCategories} />

      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} />
      ) : isPending ? (
        <CardSkeletonGrid count={10} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={Icon} title={emptyTitle} message="Ajuste os filtros ou tente outro termo de busca." />
      ) : (
        <>
          <p className="text-sm text-slate-400">{data.totalItems} resultado(s) encontrado(s)</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
            {data.items.map(renderCard)}
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
    </div>
  )
}

function CursosTab() {
  const [filters, setFilters] = useCatalogFilters()
  return (
    <CatalogTab
      icon={GraduationCap}
      emptyTitle="Nenhum curso encontrado"
      filters={filters}
      setFilters={setFilters}
      listFn={listCourses}
      queryKeyFn={courseKeys.list}
      renderCard={(course) => <CourseCard key={course.id} course={course} />}
    />
  )
}

function PostsTab() {
  const [filters, setFilters] = useCatalogFilters()
  return (
    <CatalogTab
      icon={BookOpen}
      emptyTitle="Nenhum post encontrado"
      filters={filters}
      setFilters={setFilters}
      listFn={listPosts}
      queryKeyFn={postKeys.list}
      renderCard={(post) => <PostCard key={post.id} post={post} />}
    />
  )
}

function TrilhasTab() {
  const [filters, setFilters] = useCatalogFilters()
  return (
    <CatalogTab
      icon={Waypoints}
      emptyTitle="Nenhuma trilha encontrada"
      filters={filters}
      setFilters={setFilters}
      listFn={listTrilhas}
      queryKeyFn={trilhaKeys.list}
      renderCard={(trilha) => <TrilhaCard key={trilha.id} trilha={trilha} />}
    />
  )
}

function PessoasTab({ q }) {
  const [page, setPage] = useState(0)
  useEffect(() => setPage(0), [q])

  const query = { q, page, size: PAGE_SIZE }
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: userKeys.search(query),
    queryFn: () => searchUsers(query),
    placeholderData: (previous) => previous,
  })

  if (isError) return <ErrorState message={errorMessage(error)} onRetry={refetch} />
  if (isPending) return <CardSkeletonGrid count={6} />
  if (data.items.length === 0) {
    return (
      <EmptyState icon={Users} title="Ninguem encontrado" message="Tente outro nome ou nickname." />
    )
  }
  return (
    <>
      <p className="text-sm text-slate-400">{data.totalItems} resultado(s) encontrado(s)</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((person) => (
          <PersonCard key={person.id} person={person} />
        ))}
      </div>
      <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} className="pt-4" />
    </>
  )
}

function PrincipaisTab({ q, onSeeAll }) {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: searchKeys.unified(q, PREVIEW_SIZE),
    queryFn: () => unifiedSearch(q, PREVIEW_SIZE),
  })

  if (isError) return <ErrorState message={errorMessage(error)} onRetry={refetch} />

  return (
    <div className="space-y-10">
      <PreviewSection
        icon={GraduationCap}
        title="Cursos"
        total={data?.courses.total}
        loading={isPending}
        items={data?.courses.items}
        onSeeAll={() => onSeeAll('cursos')}
        renderItem={(course) => <CourseCard key={course.id} course={course} />}
      />
      <PreviewSection
        icon={BookOpen}
        title="Posts"
        total={data?.posts.total}
        loading={isPending}
        items={data?.posts.items}
        onSeeAll={() => onSeeAll('posts')}
        renderItem={(post) => <PostCard key={post.id} post={post} />}
      />
      <PreviewSection
        icon={Waypoints}
        title="Trilhas"
        total={data?.trilhas.total}
        loading={isPending}
        items={data?.trilhas.items}
        onSeeAll={() => onSeeAll('trilhas')}
        renderItem={(trilha) => <TrilhaCard key={trilha.id} trilha={trilha} />}
      />
      <PreviewSection
        icon={Users}
        title="Pessoas"
        total={data?.people.total}
        loading={isPending}
        items={data?.people.items}
        onSeeAll={() => onSeeAll('pessoas')}
        renderItem={(person) => <PersonCard key={person.id} person={person} />}
      />

      {!isPending && [data?.courses, data?.posts, data?.trilhas, data?.people].every((section) => !section?.items.length) && (
        <EmptyState
          icon={SearchIcon}
          title="Nada encontrado"
          message={q ? `Nada corresponde a "${q}". Tente outro termo.` : 'Comece digitando algo para buscar.'}
        />
      )}
    </div>
  )
}

/** A highlight reel, not an exhaustive list - sections with no results are skipped entirely. */
function PreviewSection({ icon: Icon, title, total, loading, items, onSeeAll, renderItem }) {
  if (!loading && (!items || items.length === 0)) return null

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
          <Icon size={20} className="text-brand-400" />
          {title}
          {total != null && total > 0 && <span className="text-sm font-normal text-slate-500">({total})</span>}
        </h2>
        {!loading && items?.length > 0 && (
          <button
            type="button"
            onClick={onSeeAll}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-400 hover:text-brand-300"
          >
            Ver mais <ArrowRight size={15} />
          </button>
        )}
      </div>

      {loading ? (
        <CardSkeletonGrid count={3} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(renderItem)}</div>
      )}
    </section>
  )
}

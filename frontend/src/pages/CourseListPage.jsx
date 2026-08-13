import { useState } from 'react'
import { GraduationCap, Plus } from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { CatalogFilters } from '@/components/search/CatalogFilters'
import { CourseCard } from '@/components/course/CourseCard'
import { CreateCourseModal } from '@/components/course/CreateCourseModal'
import { NicknameGateModal } from '@/components/auth/NicknameGateModal'
import { Pagination } from '@/components/ui/Pagination'
import { CardSkeletonGrid, EmptyState, ErrorState } from '@/components/ui/Feedback'
import { useAuth } from '@/context/AuthContext'
import { useCatalogFilters } from '@/hooks/useCatalogFilters'
import { useCatalogQuery } from '@/hooks/useCatalogQuery'
import { useNicknameGate } from '@/hooks/useNicknameGate'
import { courseKeys, listCourses } from '@/api/courses'
import { errorMessage } from '@/lib/api'

export default function CourseListPage() {
  const { isAuthenticated } = useAuth()
  const [filters, setFilters] = useCatalogFilters()
  const [createOpen, setCreateOpen] = useState(false)
  const { requireNickname, nicknameModalProps } = useNicknameGate()

  const { term, setTerm, data, isPending, isError, error, refetch, availableCategories } = useCatalogQuery({
    filters,
    setFilters,
    listFn: listCourses,
    queryKeyFn: courseKeys.list,
  })

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
            <GraduationCap className="text-brand-400" /> Cursos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {data ? `${data.totalItems} curso(s) encontrado(s)` : 'Carregando catalogo...'}
          </p>
        </div>
        {isAuthenticated && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => requireNickname(() => setCreateOpen(true))}
          >
            <Plus size={16} /> Criar curso
          </button>
        )}
      </div>

      <SearchBar
        value={term}
        onChange={setTerm}
        placeholder="Buscar por nome, descricao, autor ou categoria..."
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
          icon={GraduationCap}
          title="Nenhum curso encontrado"
          message="Ajuste os filtros ou tente outro termo de busca."
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((course) => (
              <CourseCard key={course.id} course={course} />
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

      <CreateCourseModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <NicknameGateModal {...nicknameModalProps} />
    </div>
  )
}

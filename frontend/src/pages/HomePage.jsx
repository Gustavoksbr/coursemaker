import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, GraduationCap, Plus } from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { CourseCard } from '@/components/course/CourseCard'
import { PostCard } from '@/components/post/PostCard'
import { CreateCourseModal } from '@/components/course/CreateCourseModal'
import { NicknameGateModal } from '@/components/auth/NicknameGateModal'
import { CardSkeletonGrid, EmptyState, ErrorState } from '@/components/ui/Feedback'
import { useAuth } from '@/context/AuthContext'
import { useDebounce } from '@/hooks/useDebounce'
import { useNicknameGate } from '@/hooks/useNicknameGate'
import { search, searchKeys } from '@/api/users'
import { errorMessage } from '@/lib/api'

const RESULTS_PER_SECTION = 6

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const [term, setTerm] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const { requireNickname, nicknameModalProps } = useNicknameGate()
  const debouncedTerm = useDebounce(term, 300)

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: searchKeys.unified(debouncedTerm, RESULTS_PER_SECTION),
    queryFn: () => search(debouncedTerm, RESULTS_PER_SECTION),
    // Keeping the previous results while a new term is in flight stops the page flashing empty
    // on every keystroke.
    placeholderData: (previous) => previous,
  })

  const searching = debouncedTerm.trim().length > 0
  const courses = data?.courses
  const posts = data?.posts

  return (
    <>
      <section className="border-b border-slate-800 bg-gradient-to-b from-slate-800/50 to-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
            Aprenda e ensine <span className="text-brand-400">programacao</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            Cursos estruturados e posts tecnicos escritos por desenvolvedores.
          </p>

          <div className="mt-8">
            <SearchBar
              value={term}
              onChange={setTerm}
              size="lg"
              placeholder="Digite para buscar cursos, posts..."
            />
          </div>

          {isAuthenticated && (
            <button
              type="button"
              className="btn-secondary mt-4"
              onClick={() => requireNickname(() => setCreateOpen(true))}
            >
              <Plus size={16} /> Criar um curso
            </button>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6">
        {isError ? (
          <ErrorState message={errorMessage(error)} onRetry={refetch} />
        ) : (
          <>
            <Section
              icon={GraduationCap}
              title={searching ? 'Cursos' : 'Cursos em destaque'}
              total={courses?.total}
              seeAllHref={`/cursos${searching ? `?q=${encodeURIComponent(debouncedTerm)}` : ''}`}
              seeAllLabel="Ver todos os cursos"
              loading={isPending}
              empty={
                <EmptyState
                  icon={GraduationCap}
                  title={searching ? 'Nenhum curso encontrado' : 'Ainda nao ha cursos publicados'}
                  message={
                    searching
                      ? `Nada corresponde a "${debouncedTerm}". Tente outro termo.`
                      : 'Assim que alguem publicar um curso, ele aparece aqui.'
                  }
                />
              }
              items={courses?.items}
              renderItem={(course) => <CourseCard key={course.id} course={course} />}
            />

            <Section
              icon={BookOpen}
              title={searching ? 'Posts' : 'Posts recentes'}
              total={posts?.total}
              seeAllHref={`/posts${searching ? `?q=${encodeURIComponent(debouncedTerm)}` : ''}`}
              seeAllLabel="Ver todos os posts"
              loading={isPending}
              empty={
                <EmptyState
                  icon={BookOpen}
                  title={searching ? 'Nenhum post encontrado' : 'Ainda nao ha posts publicados'}
                  message={
                    searching
                      ? `Nada corresponde a "${debouncedTerm}". Tente outro termo.`
                      : 'Que tal escrever o primeiro?'
                  }
                />
              }
              items={posts?.items}
              renderItem={(post) => <PostCard key={post.id} post={post} />}
            />
          </>
        )}
      </div>

      <CreateCourseModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <NicknameGateModal {...nicknameModalProps} />
    </>
  )
}

function Section({ icon: Icon, title, total, seeAllHref, seeAllLabel, loading, items, renderItem, empty }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
          <Icon size={20} className="text-brand-400" />
          {title}
          {total != null && total > 0 && (
            <span className="text-sm font-normal text-slate-500">({total})</span>
          )}
        </h2>
        <Link
          to={seeAllHref}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-400 hover:text-brand-300"
        >
          {seeAllLabel} <ArrowRight size={15} />
        </Link>
      </div>

      {loading ? (
        <CardSkeletonGrid count={3} />
      ) : items?.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(renderItem)}</div>
      ) : (
        empty
      )}
    </section>
  )
}

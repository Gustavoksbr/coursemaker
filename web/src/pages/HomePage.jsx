import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Plus } from 'lucide-react'
import { CreateCourseModal } from '@/components/course/CreateCourseModal'
import { NicknameGateModal } from '@/components/auth/NicknameGateModal'
import { ErrorState } from '@/components/ui/Feedback'
import { Skeleton } from '@/components/ui/Skeleton'
import { MaybeLink } from '@/components/ui/MaybeLink'
import { SaveToLibraryButton } from '@/components/library/SaveToLibraryButton'
import { Reveal } from '@/components/home/Reveal'
import { courseThumb } from '@/components/home/courseThumb'
import { useAuth } from '@/context/AuthContext'
import { useAuthModal } from '@/context/AuthModalContext'
import { useNicknameGate } from '@/hooks/useNicknameGate'
import { search, searchKeys } from '@/api/users'
import { areaKeys, listAreas } from '@/api/areas'
import { listSchools, schoolKeys } from '@/api/schools'
import { getSiteSettings, getStats, homeKeys } from '@/api/home'
import { errorMessage } from '@/lib/api'
import { courseHref, postHref, trilhaHref } from '@/lib/contentLinks'
import { plural } from '@/lib/format'
import { cn } from '@/lib/cn'

// How many course tiles the area grid shows (two rows of the 4-column desktop grid).
const COURSES_PER_AREA = 8
const TRILHAS_SHOWN = 4
const POSTS_SHOWN = 5
// The landing page has no filters of its own to round-trip to the server - clicking an area just
// re-slices data that is already sitting in memory. So the initial fetch pulls a much wider pool
// than what is shown at once (up to the API's own page-size cap), traded once for every area
// click being instant instead of a network round-trip.
const POOL_SIZE = 48
// The home page always shows one area's worth of courses - there is no "every area at once" view
// anymore, so it needs a sensible starting point until the visitor picks a different one.
const DEFAULT_AREA_NAME = 'tecnologia'

const WRAP = 'mx-auto w-full max-w-[1180px] px-4 sm:px-6'

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const { openRegister } = useAuthModal()
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedAreaId, setSelectedAreaId] = useState(null)
  const { requireNickname, nicknameModalProps } = useNicknameGate()
  const searchInputRef = useRef(null)

  const { data: settings } = useQuery({ queryKey: homeKeys.settings, queryFn: getSiteSettings })
  const { data: stats } = useQuery({ queryKey: homeKeys.stats, queryFn: getStats })
  const { data: areas } = useQuery({ queryKey: areaKeys.list(), queryFn: listAreas })
  const { data: schools } = useQuery({ queryKey: schoolKeys.list(), queryFn: listSchools })

  // The landing page is the one place that stays unscoped: it shows the whole catalogue across
  // every area, which is exactly what makes the breadth of the site visible.
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: searchKeys.unified('', POOL_SIZE),
    queryFn: () => search('', POOL_SIZE),
  })

  const selectedArea = areas?.find((area) => area.id === selectedAreaId) ?? null

  // Defaults to Tecnologia (falling back to whatever sorts first if that area does not exist) the
  // moment the area list loads, and never again once the visitor has picked one themselves.
  useEffect(() => {
    if (selectedAreaId || !areas?.length) return
    const defaultArea = areas.find((area) => area.name.toLowerCase() === DEFAULT_AREA_NAME) ?? areas[0]
    setSelectedAreaId(defaultArea.id)
  }, [areas, selectedAreaId])

  // "/" focuses the search prompt, like on most developer sites - unless the visitor is already typing somewhere.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target
      if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      event.preventDefault()
      searchInputRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Clicking an area only re-slices what is already loaded above - no request, no loading state.
  // Courses and schools narrow down to that area; trilhas and posts stay the general picks, since
  // they are not what the area click is about.
  const visibleCourses = selectedArea
    ? (data?.courses.items ?? []).filter((course) => course.area?.id === selectedArea.id)
    : (data?.courses.items ?? [])

  // Before the default area resolves: whatever the admin chose for the home page, in the order
  // they set - or every school if nothing has been chosen yet. Once an area is selected (which is
  // almost immediately): only the schools actually publishing content there, derived from the same
  // preloaded pool, so this needs no extra request.
  const featuredSchools = useMemo(() => {
    if (!schools?.length) return []
    const chosen = schools
      .filter((school) => school.featuredOnHome)
      .sort((a, b) => (a.homeOrder ?? 0) - (b.homeOrder ?? 0))
    return chosen.length > 0 ? chosen : schools
  }, [schools])

  const displayedSchools = useMemo(() => {
    if (!selectedArea) return featuredSchools
    const relevantIds = new Set(
      [...(data?.courses.items ?? []), ...(data?.posts.items ?? []), ...(data?.trilhas.items ?? [])]
        .filter((item) => item.area?.id === selectedArea.id && item.school)
        .map((item) => item.school.id),
    )
    return (schools ?? []).filter((school) => relevantIds.has(school.id))
  }, [schools, featuredSchools, selectedArea, data])

  const trilhas = data?.trilhas.items ?? []
  const posts = data?.posts.items ?? []
  const showTrilhas = isPending || trilhas.length > 0
  const showPosts = isPending || posts.length > 0

  // Sections are numbered "01 — cursos", "02 — trilhas"... Empty ones are hidden, so the numbers are
  // counted from what is actually on the page instead of being hard-coded.
  const sectionNumbers = {}
  ;['cursos', showTrilhas && 'trilhas', 'como-funciona', showPosts && 'posts', 'sua-vez']
    .filter(Boolean)
    .forEach((key, index) => {
      sectionNumbers[key] = String(index + 1).padStart(2, '0')
    })

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = term.trim()
    if (!trimmed) return
    navigate(`/pesquisar?q=${encodeURIComponent(trimmed)}`)
  }

  const createCourse = () => requireNickname(() => setCreateOpen(true))

  return (
    <>
      {settings?.announcement && (
        <AnnouncementBar text={settings.announcement} href={settings.announcementHref} />
      )}

      {/* Hero ------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b border-line py-12 sm:py-[72px] lg:pb-[88px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'linear-gradient(#2a2d26 1px, transparent 1px), linear-gradient(90deg, #2a2d26 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'linear-gradient(to bottom, #000 0%, transparent 85%)',
            WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, transparent 85%)',
          }}
        />
        <div className={cn(WRAP, 'relative grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]')}>
          <div className="min-w-0">
            <p className="mb-5 font-mono text-[13px] text-ink-3">
              <span className="text-ok">●</span> gratuito · sem anúncio · progresso salvo
            </p>
            <h1 className="mb-[22px] text-[clamp(36px,5vw,56px)] font-bold leading-[1.04] tracking-[-0.035em] text-ink">
              Aquela{' '}
              <s className="font-semibold text-ink-3 decoration-brand-500 decoration-[3px]">playlist de 87 vídeos</s>{' '}
              virou um curso de verdade.
            </h1>
            <p className="mb-8 max-w-[30em] text-lg text-ink-2">
              Organizamos as melhores aulas de programação do YouTube em{' '}
              <strong className="font-medium text-ink">módulos, com exercícios que rodam no navegador</strong> e
              certificado no final. E quando você souber o bastante, publica o seu curso aqui também.
            </p>

            <form
              onSubmit={handleSubmit}
              role="search"
              className="flex h-[52px] max-w-[520px] items-center gap-2.5 rounded border border-line-2 bg-bg-2 pl-3.5 pr-3 font-mono text-[15px] transition-colors focus-within:border-brand-500"
            >
              <span aria-hidden="true" className="text-brand-500">
                &gt;
              </span>
              <input
                ref={searchInputRef}
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="o que você quer aprender?"
                aria-label="Pesquisar cursos, trilhas e posts"
                autoComplete="off"
                className="min-w-0 flex-1 border-0 bg-transparent text-ink outline-none placeholder:text-ink-3 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <kbd className="hidden rounded-[3px] border border-b-2 border-line-2 px-1.5 py-px font-mono text-[11px] text-ink-3 sm:inline">
                /
              </kbd>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <MaybeHashLink to={settings?.heroCtaHref || '#cursos'} className="btn-primary">
                {settings?.heroCtaLabel || 'Explorar cursos'} <ArrowRight size={15} />
              </MaybeHashLink>
              <a href="#trilhas" className="btn">
                Ver trilhas
              </a>
              {isAuthenticated && (
                <button type="button" className="btn" onClick={createCourse}>
                  <Plus size={15} /> Criar um curso
                </button>
              )}
            </div>

            <HeroMeta stats={stats} schools={featuredSchools} />
          </div>

          <LessonDemo />
        </div>
      </section>

      {/* 01 Cursos por área ------------------------------------------------ */}
      <section id="cursos" className="scroll-mt-16 border-b border-line py-16 sm:py-[88px]">
        <div className={WRAP}>
          <SectionHeading
            number={sectionNumbers.cursos}
            label="cursos"
            title="Comece por uma área"
            subtitle="Programação é o forte da casa, mas tem espaço para qualquer assunto que caiba em módulos e aulas."
            moreHref={
              selectedArea
                ? `/pesquisar?area=${encodeURIComponent(selectedArea.slug)}&tab=cursos`
                : '/pesquisar?tab=cursos'
            }
            moreLabel="ver todos os cursos"
          />

          {areas?.length > 0 && (
            <div role="tablist" aria-label="Áreas" className="mb-7 flex overflow-x-auto border-b border-line">
              {areas.map((area) => {
                const active = area.id === selectedAreaId
                return (
                  <button
                    key={area.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedAreaId(area.id)}
                    className={cn(
                      '-mb-px whitespace-nowrap border-b-2 px-[18px] py-3 font-mono text-sm lowercase transition-colors',
                      active
                        ? 'border-brand-500 text-ink'
                        : 'border-transparent text-ink-3 hover:text-ink-2',
                    )}
                  >
                    {area.name}
                  </button>
                )
              })}
            </div>
          )}

          {displayedSchools.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2.5 text-[13px]">
              <span className="mr-1 font-mono text-ink-3">escolas:</span>
              {displayedSchools.map((school) => (
                <Link
                  key={school.id}
                  to={`/escolas/${school.slug}`}
                  className="rounded-full border border-line-2 px-3 py-1 text-ink-2 transition-colors hover:border-ink-2 hover:text-ink"
                >
                  {school.name}
                </Link>
              ))}
              <Link to="/escolas" className="font-mono text-ink-3 hover:text-ink">
                todas →
              </Link>
            </div>
          )}

          {isError ? (
            <ErrorState message={errorMessage(error)} onRetry={refetch} />
          ) : isPending ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-64 rounded-md" />
              ))}
            </div>
          ) : visibleCourses.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visibleCourses.slice(0, COURSES_PER_AREA).map((course) => (
                <CourseTile key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <p className="font-mono text-sm text-ink-3">
              {selectedArea
                ? `// nenhum curso de ${selectedArea.name} por aqui ainda.`
                : '// nenhum curso publicado ainda.'}
            </p>
          )}
        </div>
      </section>

      {/* 02 Trilhas -------------------------------------------------------- */}
      {showTrilhas && !isError && (
        <section id="trilhas" className="scroll-mt-16 border-b border-line py-16 sm:py-[88px]">
          <div className={WRAP}>
            <SectionHeading
              number={sectionNumbers.trilhas}
              label="trilhas"
              title="Não sabe por onde começar? Siga uma trilha."
              subtitle="Sequências de cursos na ordem que faz sentido aprender, montadas por quem já fez o caminho."
              moreHref="/pesquisar?tab=trilhas"
              moreLabel="todas as trilhas"
            />
            {isPending ? (
              <Skeleton className="h-64 rounded-md" />
            ) : (
              <div className="rounded-md border border-line bg-bg-2">
                {trilhas.slice(0, TRILHAS_SHOWN).map((trilha) => (
                  <TrilhaRow key={trilha.id} trilha={trilha} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 03 Aprender × ensinar --------------------------------------------- */}
      <section className="border-b border-line py-16 sm:py-[88px]">
        <div className={WRAP}>
          <SectionHeading
            number={sectionNumbers['como-funciona']}
            label="como funciona"
            title="O mesmo lugar para estudar e para ensinar."
          />
          <div className="grid grid-cols-1 overflow-hidden rounded-md border border-line md:grid-cols-2">
            <div className="p-6 sm:p-9">
              <p className="mb-2 font-mono text-xs text-brand-500">// para quem aprende</p>
              <h3 className="mb-[18px] text-[22px] font-semibold tracking-[-0.02em] text-ink">
                Estude no seu ritmo, sem se perder.
              </h3>
              <ul className="mb-7">
                <Feature title="Progresso salvo">
                  em cada aula concluída. Fechou a aba, voltou de onde parou.
                </Feature>
                <Feature title="Código que roda no navegador,">
                  sem instalar nada para fazer os exercícios.
                </Feature>
                <Feature title="Certificado em PDF">com seu nome quando terminar um curso ou trilha.</Feature>
              </ul>
              <a href="#cursos" className="btn">
                Explorar cursos <ArrowRight size={15} />
              </a>
            </div>
            <div className="border-t border-line bg-bg-2 p-6 sm:p-9 md:border-l md:border-t-0">
              <p className="mb-2 font-mono text-xs text-brand-500">// para quem ensina</p>
              <h3 className="mb-[18px] text-[22px] font-semibold tracking-[-0.02em] text-ink">
                Monte um curso como quem organiza um repositório.
              </h3>
              <CourseTree />
              <p className="my-5 text-[15px] text-ink-2">
                Vídeos, texto, blocos de código e exercícios. A ferramenta é a mesma para todo mundo, e publicar é
                gratuito.
              </p>
              {isAuthenticated ? (
                <button type="button" className="btn" onClick={createCourse}>
                  Criar um curso <ArrowRight size={15} />
                </button>
              ) : (
                <button type="button" className="btn" onClick={openRegister}>
                  Criar um curso <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 04 Posts ---------------------------------------------------------- */}
      {showPosts && !isError && (
        <section id="posts" className="scroll-mt-16 border-b border-line py-16 sm:py-[88px]">
          <div className={WRAP}>
            <SectionHeading
              number={sectionNumbers.posts}
              label="posts"
              title="Leituras curtas"
              subtitle="Artigos e tutoriais avulsos, para quando não dá tempo de uma aula inteira."
              moreHref="/pesquisar?tab=posts"
              moreLabel="todos os posts"
            />
            {isPending ? (
              <Skeleton className="h-64 rounded-md" />
            ) : (
              <ul>
                {posts.slice(0, POSTS_SHOWN).map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* 05 Sua vez -------------------------------------------------------- */}
      <section className="py-[72px] sm:py-[110px]">
        <div className={cn(WRAP, 'grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]')}>
          <div>
            <p className="mb-2.5 font-mono text-[13px] text-brand-500">{sectionNumbers['sua-vez']} — sua vez</p>
            <h2 className="text-[clamp(30px,4vw,44px)] font-semibold leading-[1.15] tracking-[-0.025em] text-ink">
              Você também tem algo para ensinar.
            </h2>
            <p className="mb-7 mt-4 max-w-[30em] text-[17px] text-ink-2">
              Monte os módulos, escreva as aulas, coloque exercícios e compartilhe o link. Gratuito, sem aprovação,
              sem burocracia.
            </p>
            {isAuthenticated ? (
              <button type="button" className="btn-primary" onClick={createCourse}>
                <Plus size={15} /> Criar um curso
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={openRegister}>
                Criar conta grátis <ArrowRight size={15} />
              </button>
            )}
          </div>
          <div
            aria-hidden="true"
            className="overflow-x-auto rounded-md border border-line-2 bg-bg-2 px-5 py-5 font-mono text-[13px] leading-[1.8] text-ink-2 sm:px-6 sm:text-sm"
          >
            <div>
              <span className="text-brand-500">$</span> <span className="text-ink">coursemaker new</span> "APIs com
              Node.js"
            </div>
            <div>
              <span className="text-ok">✓</span> curso criado
            </div>
            <div>
              <span className="text-ok">✓</span> 3 módulos · 12 aulas · 4 exercícios
            </div>
            <div>
              <span className="text-ok">✓</span> publicado em coursemakerbr.vercel.app/courses/voce/apis-node
            </div>
            <div>
              <span className="text-brand-500">$</span>{' '}
              <span className="inline-block h-[15px] w-2 animate-blink bg-ink align-[-2px] motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      </section>

      <CreateCourseModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <NicknameGateModal {...nicknameModalProps} />
    </>
  )
}

/** The hero CTA comes from the admin settings: an in-page "#anchor" stays a plain link, a route goes through the router. */
function MaybeHashLink({ to, children, className }) {
  if (to.startsWith('#') || /^https?:\/\//.test(to)) {
    return (
      <a href={to} className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  )
}

function AnnouncementBar({ text, href }) {
  const content = (
    <span className="flex items-center justify-center gap-2 font-mono text-[13px] text-ink-2">
      <span className="text-brand-500">!</span>
      {text}
      {href && <ArrowRight size={14} className="shrink-0 text-brand-500" />}
    </span>
  )
  return (
    <div className="border-b border-line bg-bg-2 px-4 py-2.5">
      {href ? (
        <Link to={href} className="block hover:text-ink">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  )
}

/** The old big counters band, reduced to one quiet line under the hero buttons. */
function HeroMeta({ stats, schools }) {
  const names = schools.slice(0, 3).map((school) => school.name)
  const hasStats = stats && (stats.courses > 0 || stats.trilhas > 0)
  if (!hasStats && names.length === 0) return null

  return (
    <p className="mt-9 flex flex-wrap gap-x-[18px] gap-y-1 font-mono text-[13px] text-ink-3">
      {hasStats && (
        <>
          <span>
            <b className="font-medium text-ink">{stats.courses.toLocaleString('pt-BR')}</b>{' '}
            {stats.courses === 1 ? 'curso' : 'cursos'}
          </span>
          <span>
            <b className="font-medium text-ink">{stats.trilhas.toLocaleString('pt-BR')}</b>{' '}
            {stats.trilhas === 1 ? 'trilha' : 'trilhas'}
          </span>
          {stats.creators > 0 && (
            <span>
              <b className="font-medium text-ink">{stats.creators.toLocaleString('pt-BR')}</b>{' '}
              {stats.creators === 1 ? 'criador' : 'criadores'}
            </span>
          )}
        </>
      )}
      {names.length > 0 && (
        <span>
          de{' '}
          {names.map((name, index) => (
            <span key={name}>
              <b className="font-medium text-ink">{name}</b>
              {index < names.length - 1 ? ', ' : schools.length > names.length ? '…' : ''}
            </span>
          ))}
        </span>
      )}
    </p>
  )
}

const DEMO_MODULES = [
  { title: '01 · primeiros passos', items: [['done', 'O que é algoritmo'], ['done', 'Variáveis e tipos'], ['done', 'Entrada e saída']] },
  { title: '02 · controle de fluxo', items: [['done', 'Condicionais'], ['done', 'Escolha / caso'], ['now', 'Laços de repetição'], ['todo', 'Exercício: tabuada']] },
  { title: '03 · vetores', items: [['todo', 'Listas e índices']] },
]

const DEMO_OUTPUT = [1, 2, 3, 4, 5].map((i) => `${i} x 7 = ${i * 7}`)

/** The product itself as the hero "illustration": a lesson with its module list, a code editor and a run button. */
function LessonDemo() {
  const [lines, setLines] = useState([])
  const [finished, setFinished] = useState(false)
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const run = () => {
    timers.current.forEach(clearTimeout)
    setLines([])
    setFinished(false)
    timers.current = DEMO_OUTPUT.map((line, index) =>
      setTimeout(() => setLines((current) => [...current, line]), (index + 1) * 90),
    )
    timers.current.push(setTimeout(() => setFinished(true), (DEMO_OUTPUT.length + 1) * 90))
  }

  return (
    <div
      aria-label="Exemplo de aula"
      className="min-w-0 overflow-hidden rounded-md border border-line-2 bg-bg-2 text-[13px] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7),0_0_0_1px_rgba(0,0,0,0.4)]"
    >
      <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5 font-mono text-xs text-ink-3">
        <span className="truncate">
          lógica-de-programação / <b className="font-medium text-ink">aula 07</b>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          <span>7/27</span>
          <span className="block h-1 w-20 overflow-hidden rounded-sm bg-line-2">
            <span className="block h-full w-[26%] bg-ok" />
          </span>
        </span>
      </div>
      <div className="grid min-h-[340px] sm:grid-cols-[190px_1fr]">
        <div className="hidden border-r border-line py-3 text-[12.5px] sm:block">
          {DEMO_MODULES.map((module) => (
            <div key={module.title}>
              <div className="px-3.5 pb-1 pt-1.5 font-mono text-[11px] text-ink-3">{module.title}</div>
              {module.items.map(([state, title]) => (
                <div
                  key={title}
                  className={cn(
                    'flex gap-2 px-3.5 py-[5px]',
                    state === 'now' ? 'bg-bg-3 text-ink shadow-[inset_2px_0_0_#f5a524]' : 'text-ink-2',
                  )}
                >
                  <span
                    className={cn(
                      'w-3.5 flex-none font-mono',
                      state === 'done' && 'text-ok',
                      state === 'now' && 'text-brand-500',
                      state === 'todo' && 'text-ink-3',
                    )}
                  >
                    {state === 'done' ? '✓' : state === 'now' ? '▸' : '○'}
                  </span>
                  {title}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-col bg-bg-3">
          <div className="flex border-b border-line font-mono text-xs">
            <span className="border-r border-line px-3.5 py-2 text-ink-3">▶ vídeo</span>
            <span className="border-r border-line bg-bg-2 px-3.5 py-2 text-ink shadow-[inset_0_-2px_0_#f5a524]">
              tabuada.py
            </span>
            <span className="hidden border-r border-line px-3.5 py-2 text-ink-3 min-[400px]:block">anotações</span>
          </div>
          <pre className="m-0 flex-1 overflow-x-auto py-3.5 font-mono text-[13px] leading-[1.7] text-ink">
            <CodeLine n={1}>
              <span className="italic text-ink-3"># tabuada do 7 com um laço for</span>
            </CodeLine>
            <CodeLine n={2}>
              <span className="text-[#e39b5a]">numero</span> = <span className="text-[#d7a8e0]">7</span>
            </CodeLine>
            <CodeLine n={3} />
            <CodeLine n={4}>
              <span className="text-[#e39b5a]">for</span> i <span className="text-[#e39b5a]">in</span>{' '}
              <span className="text-[#9cc3e6]">range</span>(<span className="text-[#d7a8e0]">1</span>,{' '}
              <span className="text-[#d7a8e0]">6</span>):
            </CodeLine>
            <CodeLine n={5}>
              {'    '}
              <span className="text-[#9cc3e6]">print</span>(
              <span className="text-[#a9d38a]">f"{'{i}'} x {'{numero}'} = {'{i * numero}'}"</span>)
            </CodeLine>
          </pre>
          <div className="flex items-center gap-2.5 border-t border-line px-3 py-2">
            <button type="button" onClick={run} className="btn-primary px-3 py-1.5 text-xs">
              ▶ executar
            </button>
            <span className="ml-auto truncate font-mono text-[11px] text-ink-3">python 3.12 · roda no navegador</span>
          </div>
          <div
            aria-live="polite"
            className="min-h-[92px] whitespace-pre border-t border-line bg-bg px-3.5 pb-3.5 pt-2.5 font-mono text-[12.5px] text-ink-2"
          >
            {lines.length === 0 && !finished ? (
              <span className="text-ink-3">$ saída aparece aqui</span>
            ) : (
              <>
                {lines.join('\n')}
                {finished && <span className="block text-ok">✓ executado em 0.04s</span>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CodeLine({ n, children }) {
  return (
    <span className="block">
      <span className="inline-block w-9 select-none pr-3.5 text-right text-ink-3 opacity-60">{n}</span>
      {children}
    </span>
  )
}

function SectionHeading({ number, label, title, subtitle, moreHref, moreLabel }) {
  return (
    <Reveal className="mb-9 flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="mb-2.5 font-mono text-[13px] text-brand-500">
          {number} — {label}
        </p>
        <h2 className="text-[clamp(26px,3vw,34px)] font-semibold leading-[1.15] tracking-[-0.025em] text-ink">
          {title}
        </h2>
        {subtitle && <p className="mt-2 max-w-[36em] text-ink-2">{subtitle}</p>}
      </div>
      {moreHref && (
        <Link
          to={moreHref}
          className="whitespace-nowrap border-b border-line-2 pb-0.5 font-mono text-[13px] text-ink-2 transition-colors hover:border-brand-500 hover:text-ink"
        >
          {moreLabel} →
        </Link>
      )}
    </Reveal>
  )
}

/** Course tile: a few lines of code in the course's language (or a text summary) instead of a stock cover image. */
function CourseTile({ course }) {
  const href = courseHref(course)
  const { tag, color, code } = courseThumb(course)
  const source = course.school?.name ?? course.owner?.name

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-md border border-line bg-bg-2 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-line-2 motion-reduce:hover:translate-y-0">
      <div
        aria-hidden="true"
        className="relative h-32 overflow-hidden whitespace-pre border-b border-line bg-bg-3 px-4 py-3.5 font-mono text-xs leading-[1.65] text-ink-3 transition-colors group-hover:text-ink-2"
      >
        <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} />
        {code}
        <span className="absolute right-2.5 top-2.5 rounded-[3px] border border-line bg-bg px-1.5 py-px text-[11px] text-ink-2">
          {tag}
        </span>
        <span className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-bg-3" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {source && <p className="truncate font-mono text-xs text-ink-3">{source}</p>}
        <h3 className="line-clamp-2 break-words text-[16.5px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink">
          {/* The title link stretches over the whole tile, so the tile is clickable without nesting the save button in a link. */}
          <MaybeLink to={href} className="after:absolute after:inset-0 after:content-['']">
            {course.name}
          </MaybeLink>
        </h3>
        <div className="mt-auto flex items-center gap-3.5 pt-3 font-mono text-xs text-ink-3">
          <span>{plural(course.lessonCount, 'aula', 'aulas')}</span>
          <span>certificado</span>
          <SaveToLibraryButton
            kind="course"
            contentId={course.id}
            saved={course.savedByMe}
            size="sm"
            className="relative z-10 ml-auto"
          />
        </div>
      </div>
    </article>
  )
}

/** A trilha as a `git log` entry: a commit graph on the left, its topics in sequence underneath the title. */
function TrilhaRow({ trilha }) {
  const href = trilhaHref(trilha)
  const dots = Math.max(2, Math.min(Number(trilha.itemCount) || 0, 5))
  const steps = trilha.categories ?? []

  return (
    <MaybeLink
      to={href}
      className="group grid grid-cols-[28px_1fr] gap-x-[18px] gap-y-2 border-b border-line py-5 pl-2.5 pr-4 transition-colors last:border-b-0 hover:bg-bg-3 sm:grid-cols-[44px_1fr_auto] sm:py-6 sm:pl-[18px] sm:pr-6"
    >
      <span aria-hidden="true" className="relative flex flex-col items-center gap-2 pt-1">
        <span className="absolute bottom-2 top-2 w-0.5 bg-line-2" />
        {Array.from({ length: dots }, (_, index) => (
          <i
            key={index}
            className={cn(
              'relative h-2.5 w-2.5 rounded-full border-2',
              index === 0 ? 'border-brand-500 bg-brand-500' : 'border-ink-3 bg-bg-2',
            )}
          />
        ))}
      </span>
      <span className="min-w-0">
        <span className="mb-1.5 block text-[19px] font-semibold tracking-[-0.015em] text-ink transition-colors group-hover:text-brand-400">
          {trilha.title}
        </span>
        {trilha.description && (
          <span className="mb-3 line-clamp-2 block max-w-[46em] text-[15px] text-ink-2">{trilha.description}</span>
        )}
        {steps.length > 0 && (
          <span className="flex flex-wrap gap-y-1.5 font-mono text-[12.5px] text-ink-2">
            {steps.slice(0, 5).map((step, index) => (
              <span key={step}>
                {index > 0 && <span className="mx-2.5 text-ink-3">→</span>}
                {step.toLowerCase()}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="col-start-2 flex gap-3.5 whitespace-nowrap font-mono text-xs text-ink-3 sm:col-start-3 sm:flex-col sm:justify-center sm:gap-1 sm:text-right">
        <b className="text-sm font-medium text-ink">{plural(trilha.itemCount, 'item', 'itens')}</b>
        <span>{trilha.school?.name ?? trilha.owner?.name}</span>
      </span>
    </MaybeLink>
  )
}

/** "15 set 2026": the changelog column is narrow, so the date skips the "de" and the dots of the long format. */
function shortDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${String(date.getDate()).padStart(2, '0')} ${month} ${date.getFullYear()}`
}

/** A post as a changelog entry: date, title and summary, tags on the right. */
function PostRow({ post }) {
  const href = postHref(post)
  const tags = (post.categories ?? []).slice(0, 2)

  return (
    <li className="border-t border-line last:border-b">
      <MaybeLink
        to={href}
        className="group grid items-baseline gap-1.5 px-1 py-[22px] transition-colors hover:bg-bg-2 sm:grid-cols-[110px_1fr_auto] sm:gap-6"
      >
        <time dateTime={post.createdAt} className="font-mono text-[13px] text-ink-3">
          {shortDate(post.createdAt)}
        </time>
        <span className="min-w-0">
          <span className="mb-1 block text-lg font-semibold tracking-[-0.01em] text-ink transition-colors group-hover:text-brand-500">
            {post.title}
          </span>
          {post.description && <span className="line-clamp-2 block text-[15px] text-ink-2">{post.description}</span>}
        </span>
        {tags.length > 0 && (
          <span className="hidden whitespace-nowrap font-mono text-xs text-ink-3 sm:block">
            {tags.map((tag) => `#${tag.toLowerCase().replace(/\s+/g, '-')}`).join(' ')}
          </span>
        )}
      </MaybeLink>
    </li>
  )
}

function Feature({ title, children }) {
  return (
    <li className="grid grid-cols-[26px_1fr] border-t border-dashed border-line-2 py-3 text-[15px] text-ink-2">
      <span className="font-mono text-ok">✓</span>
      <span>
        <b className="font-medium text-ink">{title}</b> {children}
      </span>
    </li>
  )
}

function CourseTree() {
  return (
    <div
      aria-label="Exemplo de estrutura de curso"
      className="overflow-x-auto whitespace-pre rounded border border-line bg-bg px-[18px] py-4 font-mono text-[13px] leading-[1.75] text-ink-2"
    >
      <span className="text-ink">meu-curso/</span>
      {'\n├── '}
      <span className="text-ink">01-introducao/</span>
      {'\n│   ├── 01-o-que-e-uma-api      '}
      <span className="text-ink-3">▶ vídeo</span>
      {'\n│   └── 02-primeiro-endpoint    '}
      <span className="text-ink-3">{'{ } código'}</span>
      {'\n├── '}
      <span className="text-ink">02-banco-de-dados/</span>
      {'\n│   ├── 01-modelando-tabelas    '}
      <span className="text-ink-3">¶ texto</span>
      {'\n│   └── 02-desafio              '}
      <span className="text-brand-500">✦ exercício</span>
      {'\n└── certificado.pdf             '}
      <span className="text-ink-3">automático</span>
    </div>
  )
}

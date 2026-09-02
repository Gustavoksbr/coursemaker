import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  GraduationCap,
  Landmark,
  Layers,
  PenSquare,
  Plus,
  Quote,
  Waypoints,
} from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { CourseCard } from '@/components/course/CourseCard'
import { PostCard } from '@/components/post/PostCard'
import { TrilhaCard } from '@/components/trilha/TrilhaCard'
import { CreateCourseModal } from '@/components/course/CreateCourseModal'
import { NicknameGateModal } from '@/components/auth/NicknameGateModal'
import { CardSkeletonGrid, ErrorState } from '@/components/ui/Feedback'
import { Avatar } from '@/components/ui/Avatar'
import { Reveal } from '@/components/home/Reveal'
import { useAuth } from '@/context/AuthContext'
import { useNicknameGate } from '@/hooks/useNicknameGate'
import { useCountUp } from '@/hooks/useReveal'
import { search, searchKeys } from '@/api/users'
import { areaKeys, listAreas } from '@/api/areas'
import { listSchools, schoolKeys } from '@/api/schools'
import { getSiteSettings, getStats, homeKeys, listTestimonials } from '@/api/home'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

// How many cards each section actually renders.
const CARDS_PER_SECTION = 6
// The landing page has no filters of its own to round-trip to the server - clicking an area just
// re-slices data that is already sitting in memory. So the initial fetch pulls a much wider pool
// than what is shown at once (up to the API's own page-size cap), traded once for every area
// click being instant instead of a network round-trip.
const POOL_SIZE = 48
// The home page always shows one area's worth of courses - there is no "every area at once" view
// anymore, so it needs a sensible starting point until the visitor picks a different one.
const DEFAULT_AREA_NAME = 'tecnologia'

const VALUE_PROPS = [
  {
    icon: GraduationCap,
    title: 'Aprenda no seu ritmo',
    text: 'Cursos organizados em modulos e aulas, com seu progresso salvo a cada licao concluida.',
  },
  {
    icon: Waypoints,
    title: 'Siga trilhas guiadas',
    text: 'Sequencias de cursos e posts montadas por quem ja percorreu o caminho, na ordem certa.',
  },
  {
    icon: PenSquare,
    title: 'Publique o que voce sabe',
    text: 'Monte seu proprio curso, escreva posts e organize trilhas. A ferramenta e a mesma para todo mundo.',
  },
  {
    icon: Award,
    title: 'Receba certificado',
    text: 'Ao concluir um curso ou uma trilha, voce baixa um certificado em PDF com seu nome.',
  },
]

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedAreaId, setSelectedAreaId] = useState(null)
  const { requireNickname, nicknameModalProps } = useNicknameGate()

  const { data: settings } = useQuery({ queryKey: homeKeys.settings, queryFn: getSiteSettings })
  const { data: stats } = useQuery({ queryKey: homeKeys.stats, queryFn: getStats })
  const { data: areas } = useQuery({ queryKey: areaKeys.list(), queryFn: listAreas })
  const { data: schools } = useQuery({ queryKey: schoolKeys.list(), queryFn: listSchools })
  const { data: testimonials } = useQuery({ queryKey: homeKeys.testimonials, queryFn: listTestimonials })

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

  // Clicking an area only re-slices what is already loaded above - no request, no loading state.
  // Courses and schools narrow down to that area; trilhas and posts stay the general picks, since
  // they are not what the area click is about.
  const visibleCourses = selectedArea
    ? (data?.courses.items ?? []).filter((course) => course.area?.id === selectedArea.id)
    : (data?.courses.items ?? [])

  // Before the default area resolves: whatever the admin flagged "featured on home", or every
  // school if nobody has been flagged yet - same "empty curation means show all" default used
  // elsewhere. Once an area is selected (which is almost immediately): only the schools actually
  // publishing content there, derived from the same preloaded pool, so this needs no extra request.
  const displayedSchools = useMemo(() => {
    if (!schools?.length) return []
    if (!selectedArea) {
      const featured = schools.filter((school) => school.featuredOnHome)
      return featured.length > 0 ? featured : schools
    }
    const relevantIds = new Set(
      [...(data?.courses.items ?? []), ...(data?.posts.items ?? []), ...(data?.trilhas.items ?? [])]
        .filter((item) => item.area?.id === selectedArea.id && item.school)
        .map((item) => item.school.id),
    )
    return schools.filter((school) => relevantIds.has(school.id))
  }, [schools, selectedArea, data])

  const selectArea = (areaId) => setSelectedAreaId(areaId)

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = term.trim()
    if (!trimmed) return
    navigate(`/pesquisar?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <>
      {settings?.announcement && (
        <AnnouncementBar text={settings.announcement} href={settings.announcementHref} />
      )}

      {/* 1. Hero -------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-800/50 to-slate-900">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <Reveal as="h1" className="text-3xl font-bold tracking-tight text-slate-100 sm:text-5xl">
            {settings?.heroTitle ?? 'Aprenda e ensine'}{' '}
            <span className="text-brand-400">{settings?.heroHighlight ?? 'o que quiser'}</span>
          </Reveal>

          <Reveal delayMs={80}>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
              {settings?.heroSubtitle ??
                'Cursos estruturados, posts e trilhas escritos por quem entende do assunto.'}
            </p>
          </Reveal>

          <Reveal delayMs={160}>
            <form onSubmit={handleSubmit} className="mt-8">
              <SearchBar
                value={term}
                onChange={setTerm}
                size="lg"
                placeholder="O que voce quer aprender hoje?"
              />
            </form>
          </Reveal>

          <Reveal delayMs={240}>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to={settings?.heroCtaHref || '/pesquisar'} className="btn-primary">
                {settings?.heroCtaLabel || 'Explorar conteudo'} <ArrowRight size={16} />
              </Link>
              {isAuthenticated && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => requireNickname(() => setCreateOpen(true))}
                >
                  <Plus size={16} /> Criar um curso
                </button>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2. Counters ---------------------------------------------------- */}
      <section className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4">
          <Stat value={stats?.courses} label="cursos" />
          <Stat value={stats?.trilhas} label="trilhas" />
          <Stat value={stats?.posts} label="posts" />
          <Stat value={stats?.creators} label="criadores" />
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:px-6">
        {isError ? (
          <ErrorState message={errorMessage(error)} onRetry={refetch} />
        ) : (
          <>
            {/* 3. Areas ------------------------------------------------- */}
            {areas?.length > 0 && (
              <section>
                <Reveal>
                  <SectionHeading
                    icon={Layers}
                    title="Explore por area"
                    subtitle="Clique numa area para ver os cursos e escolas dela aqui mesmo - sem sair da pagina."
                  />
                </Reveal>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {areas.map((area, index) => {
                    const active = area.id === selectedAreaId
                    return (
                      <Reveal key={area.id} delayMs={index * 60}>
                        <button
                          type="button"
                          onClick={() => selectArea(area.id)}
                          aria-pressed={active}
                          className={cn(
                            'card group flex h-full w-full items-center gap-3 p-5 text-left transition-colors',
                            active ? 'border-brand-500 bg-brand-500/10' : 'hover:border-brand-500',
                          )}
                        >
                          <span
                            className={cn(
                              'grid h-10 w-10 shrink-0 place-items-center rounded-lg',
                              active ? 'bg-brand-500 text-white' : 'bg-brand-500/15 text-brand-400',
                            )}
                          >
                            <Layers size={18} />
                          </span>
                          <span
                            className={cn(
                              'min-w-0 flex-1 font-semibold',
                              active ? 'text-brand-300' : 'text-slate-100 group-hover:text-brand-400',
                            )}
                          >
                            {area.name}
                          </span>
                          {active ? (
                            <Check size={16} className="shrink-0 text-brand-400" />
                          ) : (
                            <ArrowRight
                              size={16}
                              className="shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-400"
                            />
                          )}
                        </button>
                      </Reveal>
                    )
                  })}
                </div>
              </section>
            )}

            {/* 4. Schools -------------------------------------------------- */}
            {schools?.length > 0 && (
              <section>
                <Reveal>
                  <SectionHeading
                    icon={Landmark}
                    title={selectedArea ? `Escolas em ${selectedArea.name}` : 'Escolas'}
                    subtitle="Procedencia do conteudo publicado aqui, nao uma parceria oficial."
                    seeAllHref="/escolas"
                    seeAllLabel="Ver mais escolas"
                  />
                </Reveal>
                {displayedSchools.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhuma escola publicou em {selectedArea?.name} ainda.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {displayedSchools.map((school, index) => (
                      <Reveal key={school.id} delayMs={index * 60}>
                        <Link
                          to={`/escolas/${school.slug}`}
                          className="card group flex h-full items-center gap-3 p-5 transition-colors hover:border-brand-500"
                        >
                          {school.logoUrl ? (
                            <img
                              src={school.logoUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-400">
                              <Landmark size={18} />
                            </span>
                          )}
                          <span className="min-w-0 flex-1 font-semibold text-slate-100 group-hover:text-brand-400">
                            {school.name}
                          </span>
                          <ArrowRight
                            size={16}
                            className="shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-400"
                          />
                        </Link>
                      </Reveal>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* 5. Featured courses -------------------------------------- */}
            <ContentSection
              icon={GraduationCap}
              title={selectedArea ? `Cursos em ${selectedArea.name}` : 'Cursos em destaque'}
              subtitle={selectedArea ? `Selecionados na area ${selectedArea.name}.` : 'Comece por aqui.'}
              total={selectedArea ? null : data?.courses.total}
              seeAllHref={
                selectedArea
                  ? `/pesquisar?area=${encodeURIComponent(selectedArea.slug)}&tab=cursos`
                  : '/pesquisar?tab=cursos'
              }
              seeAllLabel={selectedArea ? `Ver mais cursos de ${selectedArea.name}` : 'Ver todos os cursos'}
              loading={isPending}
              items={visibleCourses.slice(0, CARDS_PER_SECTION)}
              emptyMessage={selectedArea ? `Nenhum curso de ${selectedArea.name} em destaque agora.` : null}
              renderItem={(course) => <CourseCard key={course.id} course={course} />}
            />

            {/* 6. How it works ------------------------------------------ */}
            <section>
              <Reveal>
                <SectionHeading title="Como funciona" subtitle="O mesmo lugar para estudar e para ensinar." />
              </Reveal>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {VALUE_PROPS.map(({ icon: Icon, title, text }, index) => (
                  <Reveal key={title} delayMs={index * 70}>
                    <div className="card h-full p-5">
                      <span className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-brand-500/15 text-brand-400">
                        <Icon size={19} />
                      </span>
                      <h3 className="font-bold text-slate-100">{title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </section>

            {/* 7. Featured trilhas -------------------------------------- */}
            <ContentSection
              icon={Waypoints}
              title="Trilhas para seguir"
              subtitle="Sequencias completas, na ordem que faz sentido aprender."
              total={data?.trilhas.total}
              seeAllHref="/pesquisar?tab=trilhas"
              seeAllLabel="Ver todas as trilhas"
              loading={isPending}
              items={data?.trilhas.items}
              renderItem={(trilha) => <TrilhaCard key={trilha.id} trilha={trilha} />}
            />

            {/* 8. Recent posts ------------------------------------------ */}
            <ContentSection
              icon={BookOpen}
              title="Posts recentes"
              subtitle="Artigos e tutoriais avulsos, para leituras mais curtas."
              total={data?.posts.total}
              seeAllHref="/pesquisar?tab=posts"
              seeAllLabel="Ver todos os posts"
              loading={isPending}
              items={data?.posts.items}
              renderItem={(post) => <PostCard key={post.id} post={post} />}
            />
          </>
        )}

        {/* 8. Testimonials - hidden until the admin adds some ------------ */}
        {testimonials?.length > 0 && (
          <section>
            <Reveal>
              <SectionHeading icon={Quote} title="Quem usa, conta" />
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <Reveal key={testimonial.id} delayMs={index * 70}>
                  <figure className="card flex h-full flex-col gap-4 p-5">
                    <Quote size={20} className="shrink-0 text-brand-400/60" />
                    <blockquote className="flex-1 text-sm leading-relaxed text-slate-300">
                      {testimonial.quote}
                    </blockquote>
                    <figcaption className="flex items-center gap-2.5 border-t border-slate-700/70 pt-3">
                      <Avatar src={testimonial.authorImage} name={testimonial.authorName} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-200">
                          {testimonial.authorName}
                        </span>
                        {testimonial.authorRole && (
                          <span className="block truncate text-xs text-slate-500">{testimonial.authorRole}</span>
                        )}
                      </span>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 9. Closing CTA ------------------------------------------------- */}
      <section className="border-t border-slate-800 bg-slate-800/30">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <Reveal>
            <h2 className="text-2xl font-bold text-slate-100 sm:text-3xl">
              Voce tambem tem algo para ensinar
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-slate-400">
              Publicar um curso no CourseMaker e gratuito. Monte os modulos, escreva as aulas e
              compartilhe o link.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              {isAuthenticated ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => requireNickname(() => setCreateOpen(true))}
                >
                  <Plus size={16} /> Criar um curso
                </button>
              ) : (
                <Link to="/register" className="btn-primary">
                  Criar conta gratis <ArrowRight size={16} />
                </Link>
              )}
              <Link to="/pesquisar" className="btn-secondary">
                Explorar conteudo
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <CreateCourseModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <NicknameGateModal {...nicknameModalProps} />
    </>
  )
}

function AnnouncementBar({ text, href }) {
  const content = (
    <span className="flex items-center justify-center gap-2 text-sm text-brand-100">
      {text}
      {href && <ArrowRight size={14} className="shrink-0" />}
    </span>
  )
  return (
    <div className="bg-brand-600/90 px-4 py-2.5">
      {href ? (
        <Link to={href} className="block hover:opacity-90">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  )
}

function Stat({ value, label }) {
  const [ref, animated] = useCountUp(value)
  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl font-bold text-brand-400 sm:text-4xl">{animated.toLocaleString('pt-BR')}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </div>
  )
}

function SectionHeading({ icon: Icon, title, subtitle, total, seeAllHref, seeAllLabel }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-100 sm:text-2xl">
          {Icon && <Icon size={22} className="text-brand-400" />}
          {title}
          {total != null && total > 0 && (
            <span className="text-sm font-normal text-slate-500">({total})</span>
          )}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {seeAllHref && (
        <Link
          to={seeAllHref}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-400 hover:text-brand-300"
        >
          {seeAllLabel} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  )
}

/**
 * A content row. With no `emptyMessage` it hides itself entirely when there is nothing to show -
 * the original behaviour for the unfiltered sections. With one (the area-scoped courses section)
 * it stays visible and explains the empty state instead of just vanishing when the user clicks an
 * area whose content isn't in the preloaded pool.
 */
function ContentSection({
  icon,
  title,
  subtitle,
  total,
  seeAllHref,
  seeAllLabel,
  loading,
  items,
  renderItem,
  emptyMessage,
}) {
  if (!loading && !items?.length && !emptyMessage) return null

  return (
    <section>
      <Reveal>
        <SectionHeading
          icon={icon}
          title={title}
          subtitle={subtitle}
          total={total}
          seeAllHref={seeAllHref}
          seeAllLabel={seeAllLabel}
        />
      </Reveal>
      {loading ? (
        <CardSkeletonGrid count={3} />
      ) : items?.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
          {items.map((item, index) => (
            <Reveal key={item.id} delayMs={Math.min(index, 5) * 60}>
              {renderItem(item)}
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      )}
    </section>
  )
}

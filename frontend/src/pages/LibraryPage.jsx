import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Award,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  FolderOpen,
  GraduationCap,
  History,
  ListChecks,
  Plus,
  Search,
  Waypoints,
} from 'lucide-react'
import { FolderCard } from '@/components/library/FolderCard'
import { FolderModal } from '@/components/library/FolderModal'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, ContentBadges } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Field'
import { MaybeLink } from '@/components/ui/MaybeLink'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { useLibraryArea } from '@/context/AreaContext'
import { courseHref, trilhaHref } from '@/lib/contentLinks'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/cn'
import { courseKeys, lastAccessedCourse } from '@/api/courses'
import { getLibraryOverview, libraryKeys, listFolders } from '@/api/library'

const SECTIONS = [
  { id: 'continuar', label: 'Continuar assistindo', icon: History },
  { id: 'meus-cursos', label: 'Meus cursos e trilhas', icon: ListChecks },
  { id: 'pastas', label: 'Pastas', icon: FolderOpen },
]

const STATUS_META = {
  NOT_STARTED: { label: 'Nao iniciado', tone: 'neutral', icon: Circle },
  IN_PROGRESS: { label: 'Em andamento', tone: 'brand', icon: Clock },
  COMPLETED: { label: 'Concluido', tone: 'featured', icon: CheckCircle2 },
}

export default function LibraryPage() {
  const { area, areas, setLibrarySlug } = useLibraryArea()
  const areaId = area?.id
  const [createFolderOpen, setCreateFolderOpen] = useState(false)

  // `areaId` undefined means "all areas" - a valid state, so these always run.
  const lastAccessedQuery = useQuery({
    queryKey: courseKeys.lastAccessed(areaId),
    queryFn: () => lastAccessedCourse(areaId),
  })
  const overviewQuery = useQuery({ queryKey: libraryKeys.overview, queryFn: getLibraryOverview })
  const foldersQuery = useQuery({
    queryKey: libraryKeys.folders(areaId),
    queryFn: () => listFolders(areaId),
  })

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6">
      <aside className="hidden w-52 shrink-0 lg:block">
        <nav className="sticky top-20 space-y-1">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            >
              <Icon size={15} /> {label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 space-y-12">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Sua biblioteca</h1>
          <p className="mt-1 text-sm text-slate-400">Cursos, posts e trilhas que voce matriculou, segue ou salvou.</p>

          {/* The one place area separation genuinely helps: keeping unrelated subjects apart on
              your own shelf. Public discovery stays unscoped - there area is just a filter. */}
          {areas.length > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <AreaTab active={!area} onClick={() => setLibrarySlug(null)}>
                Todas as areas
              </AreaTab>
              {areas.map((candidate) => (
                <AreaTab
                  key={candidate.id}
                  active={area?.id === candidate.id}
                  onClick={() => setLibrarySlug(candidate.slug)}
                >
                  {candidate.name}
                </AreaTab>
              ))}
            </div>
          )}
        </div>

        <section id="continuar" className="scroll-mt-20">
          <SectionTitle icon={History} title="Continuar assistindo" />
          {lastAccessedQuery.isPending ? (
            <Loading />
          ) : lastAccessedQuery.data ? (
            <ContinueWatchingCard course={lastAccessedQuery.data} />
          ) : (
            <EmptyState
              icon={History}
              title="Nada por aqui ainda"
              message="Assim que voce abrir um curso em que esta matriculado, ele aparece aqui."
            />
          )}
        </section>

        <section id="meus-cursos" className="scroll-mt-20">
          <LibraryOverviewTable
            items={overviewQuery.data ?? []}
            loading={overviewQuery.isPending}
            areaId={areaId}
          />
        </section>

        <section id="pastas" className="scroll-mt-20">
          <div className="mb-3 flex items-center justify-between gap-4">
            <SectionTitle icon={FolderOpen} title="Pastas" count={foldersQuery.data?.length} bare />
            <button type="button" onClick={() => setCreateFolderOpen(true)} className="btn-secondary text-xs">
              <Plus size={14} /> Nova pasta
            </button>
          </div>
          {foldersQuery.isPending ? (
            <Loading />
          ) : foldersQuery.data.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="Nenhuma pasta ainda"
              message="Crie pastas para organizar o que voce salvar, como numa biblioteca."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {foldersQuery.data.map((folder) => (
                <FolderCard key={folder.id} folder={folder} />
              ))}
            </div>
          )}
        </section>
      </div>

      <FolderModal open={createFolderOpen} onClose={() => setCreateFolderOpen(false)} />
    </div>
  )
}

/**
 * Every enrolled course and followed trilha as one filterable, sortable table - replaces the old
 * separate "Em andamento" / "Concluidos" / "Trilhas que sigo" scroll rows with a single view that
 * scales past a handful of items and puts the certificate one click away instead of behind a blind
 * download.
 */
function LibraryOverviewTable({ items, loading, areaId }) {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent')

  const contentOf = (item) => (item.kind === 'course' ? item.course : item.trilha)
  const nameOf = (item) => (item.kind === 'course' ? item.course.name : item.trilha.title)

  const visibleItems = useMemo(() => {
    let rows = items
    if (areaId) rows = rows.filter((item) => contentOf(item).area?.id === areaId)
    if (status) rows = rows.filter((item) => item.status === status)
    const term = search.trim().toLowerCase()
    if (term) rows = rows.filter((item) => nameOf(item).toLowerCase().includes(term))

    if (sort === 'name') {
      rows = [...rows].sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'pt-BR'))
    } else if (sort === 'progress') {
      rows = [...rows].sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1))
    }
    // 'recent' needs no re-sort: the API already returns lastInteraction desc.
    return rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, areaId, status, search, sort])

  return (
    <div className="space-y-4">
      <SectionTitle icon={ListChecks} title="Meus cursos e trilhas" count={items.length} bare />

      <div className="flex flex-wrap items-end gap-3">
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filtrar por status"
          className="w-40"
        >
          <option value="">Todos os status</option>
          <option value="IN_PROGRESS">Em andamento</option>
          <option value="COMPLETED">Concluido</option>
          <option value="NOT_STARTED">Nao iniciado</option>
        </Select>

        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome..."
            aria-label="Buscar"
            className="input pl-9"
          />
        </div>

        <Select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label="Ordenar"
          className="ml-auto w-48"
        >
          <option value="recent">Ultima interacao</option>
          <option value="name">Ordem alfabetica</option>
          <option value="progress">Progresso</option>
        </Select>
      </div>

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nada por aqui ainda"
          message="Cursos em que voce se matricular e trilhas que seguir aparecem aqui, com o progresso sempre a vista."
          action={
            <Link to="/pesquisar" className="btn-secondary">
              Explorar conteudo
            </Link>
          }
        />
      ) : visibleItems.length === 0 ? (
        <EmptyState icon={Search} title="Nada encontrado" message="Ajuste os filtros ou a busca." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Conteudo</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="w-52 px-5 py-3">Progresso</th>
                  <th className="px-5 py-3">Ultima interacao</th>
                  <th className="px-5 py-3">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {visibleItems.map((item) => (
                  <OverviewRow key={`${item.kind}-${contentOf(item).id}`} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function OverviewRow({ item }) {
  const content = item.kind === 'course' ? item.course : item.trilha
  const name = item.kind === 'course' ? content.name : content.title
  const href = item.kind === 'course' ? courseHref(content) : trilhaHref(content)
  const meta = STATUS_META[item.status]
  const StatusIcon = meta.icon
  const KindIcon = item.kind === 'course' ? GraduationCap : Waypoints

  return (
    <tr className="transition-colors hover:bg-slate-800/40">
      <td className="px-5 py-4">
        <Link to={href} className="flex items-center gap-3 hover:text-brand-400">
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
              item.kind === 'course' ? 'bg-brand-500/15 text-brand-400' : 'bg-violet-500/15 text-violet-300',
            )}
          >
            <KindIcon size={17} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-100">{name}</p>
            <p className="truncate text-xs text-slate-500">
              {item.kind === 'course' ? 'Curso' : 'Trilha'}
              {content.area && ` · ${content.area.name}`}
            </p>
          </div>
        </Link>
      </td>
      <td className="px-5 py-4">
        <Badge tone={meta.tone}>
          <StatusIcon size={12} /> {meta.label}
        </Badge>
      </td>
      <td className="px-5 py-4">
        {item.percentage == null ? (
          <span className="text-xs text-slate-600">—</span>
        ) : (
          <div className="flex items-center gap-2">
            <ProgressBar percentage={item.percentage} showLabel={false} className="flex-1" />
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-slate-400">
              {item.percentage}%
            </span>
          </div>
        )}
      </td>
      <td className="px-5 py-4 text-slate-400">{formatRelative(item.lastInteraction)}</td>
      <td className="px-5 py-4">
        {item.status === 'COMPLETED' ? (
          <Link to={`${href}/certificado`} className="inline-flex items-center gap-1.5 font-medium text-brand-400 hover:text-brand-300">
            <Award size={14} /> Ver certificado
          </Link>
        ) : (
          <Link to={href} className="inline-flex items-center gap-1 font-medium text-brand-400 hover:text-brand-300">
            {item.status === 'NOT_STARTED' ? 'Comecar' : 'Continuar'} <ArrowRight size={14} />
          </Link>
        )}
      </td>
    </tr>
  )
}

function AreaTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'badge border transition-colors',
        active
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:text-slate-100',
      )}
    >
      {children}
    </button>
  )
}

function SectionTitle({ icon: Icon, title, count, bare }) {
  if (bare) {
    return (
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
        <Icon size={18} className="text-brand-400" /> {title}
        {count != null && count > 0 && <span className="text-sm font-normal text-slate-500">({count})</span>}
      </h2>
    )
  }
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
        <Icon size={18} className="text-brand-400" /> {title}
        {count != null && count > 0 && <span className="text-sm font-normal text-slate-500">({count})</span>}
      </h2>
    </div>
  )
}

function Loading() {
  return (
    <div className="flex justify-center py-8">
      <Spinner />
    </div>
  )
}

function ContinueWatchingCard({ course }) {
  const href = courseHref(course)
  return (
    <MaybeLink
      to={href}
      className="card flex flex-col gap-4 overflow-hidden p-4 sm:flex-row sm:items-center"
    >
      <Thumbnail src={course.thumbnailUrl} alt={course.name} className="w-full rounded-lg sm:w-56" />
      <div className="min-w-0 flex-1">
        <ContentBadges
          status={course.status}
          visibility={course.visibility}
          featured={course.featured}
          school={course.school}
          className="mb-2"
        />
        <h3 className="truncate text-lg font-bold text-slate-100">{course.name}</h3>
        {course.description && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{course.description}</p>}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Avatar src={course.owner.image} name={course.owner.name} size="sm" />
          {course.owner.name}
        </div>
      </div>
    </MaybeLink>
  )
}

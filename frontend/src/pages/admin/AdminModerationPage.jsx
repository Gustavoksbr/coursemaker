import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Ban, BookOpen, FileText, ShieldOff, Waypoints } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback'
import { BlockToggleButton } from '@/components/shared/BlockToggleButton'
import { adminKeys, listBlockedContent } from '@/api/admin'
import { errorMessage } from '@/lib/api'
import { formatRelative } from '@/lib/format'

const KIND_LABEL = { course: 'Curso', post: 'Post', trilha: 'Trilha' }
const KIND_ICON = { course: BookOpen, post: FileText, trilha: Waypoints }
const KIND_HREF = {
  course: (item) => `/courses/${item.owner.nickname}/${item.slug}`,
  post: (item) => `/posts/${item.owner.nickname}/${item.slug}`,
  trilha: (item) => `/trilhas/${item.owner.nickname}/${item.slug}`,
}

export default function AdminModerationPage() {
  const queryClient = useQueryClient()

  const { data: items, isPending, isError, error, refetch } = useQuery({
    queryKey: adminKeys.blockedContent,
    queryFn: listBlockedContent,
  })

  const onUnblocked = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.blockedContent })
  }

  if (isPending) return <PageLoader label="Carregando conteudo bloqueado..." />

  if (isError) {
    return (
      <ErrorState
        title="Nao foi possivel carregar"
        message={errorMessage(error, 'Tente novamente em instantes.')}
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Moderacao</h1>
        <p className="mt-1 text-sm text-slate-400">
          Cursos, posts e trilhas que voce ou outro admin bloqueou. Bloqueado, o conteudo some das
          listagens e paginas publicas, mas continua existindo.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ShieldOff}
          title="Nenhum conteudo bloqueado"
          message="Quando um admin bloquear um curso, post ou trilha, ele aparece aqui."
        />
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700">
          {items.map((item) => {
            const Icon = KIND_ICON[item.kind] ?? Ban
            return (
              <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-400">
                  <Icon size={16} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="badge bg-slate-700 text-slate-400">{KIND_LABEL[item.kind]}</span>
                    <Link
                      to={KIND_HREF[item.kind](item)}
                      className="truncate font-medium text-slate-200 hover:text-brand-400"
                    >
                      {item.title}
                    </Link>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <Avatar src={item.owner.image} name={item.owner.name} size="sm" />
                    <span>@{item.owner.nickname}</span>
                    <span>&middot;</span>
                    <span>bloqueado {formatRelative(item.blockedAt)}</span>
                  </div>
                </div>

                <BlockToggleButton kind={item.kind} item={{ ...item, blockedByAdmin: true }} onSuccess={onUnblocked} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

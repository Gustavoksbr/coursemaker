import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback'
import { listConversations, messageKeys } from '@/api/messages'
import { errorMessage } from '@/lib/api'
import { formatRelative } from '@/lib/format'

export default function ConversationListPage() {
  const { data: conversations, isPending, isError, error, refetch } = useQuery({
    queryKey: messageKeys.conversations,
    queryFn: listConversations,
  })

  if (isPending) return <PageLoader label="Carregando conversas..." />

  if (isError) {
    return (
      <ErrorState
        title="Nao foi possivel carregar suas conversas"
        message={errorMessage(error)}
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
        <Mail size={22} className="text-brand-400" />
        Mensagens
      </h1>

      {conversations.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Nenhuma conversa ainda"
          message="Mensagens que voce enviar ou receber aparecem aqui."
        />
      ) : (
        <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
          {conversations.map((conversation) => (
            <li key={conversation.partner.id}>
              <Link
                to={`/mensagens/${conversation.partner.nickname}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800/60"
              >
                <Avatar src={conversation.partner.image} name={conversation.partner.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-semibold text-slate-100">{conversation.partner.name}</p>
                    <time className="shrink-0 text-xs text-slate-500">
                      {formatRelative(conversation.lastMessageAt)}
                    </time>
                  </div>
                  <p className="truncate text-sm text-slate-400">
                    {conversation.lastMessageDeleted ? (
                      <span className="italic">Mensagem apagada</span>
                    ) : (
                      <>
                        {conversation.lastMessageMine && 'Voce: '}
                        {conversation.lastMessagePreview}
                        {conversation.lastMessageEdited && ' (editado)'}
                      </>
                    )}
                  </p>
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-semibold text-white">
                    {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

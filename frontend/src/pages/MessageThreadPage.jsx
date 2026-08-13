import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CornerUpLeft, Pencil, Trash2, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { ConfirmModal } from '@/components/ui/Modal'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { deleteMessage, editMessage, listThread, messageKeys, sendMessage } from '@/api/messages'
import { getPublicProfile, userKeys } from '@/api/users'
import { errorMessage } from '@/lib/api'
import { LIMITS } from '@/lib/constants'
import { formatDateTime, formatTime } from '@/lib/format'
import { cn } from '@/lib/cn'

export default function MessageThreadPage() {
  const { nickname } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [content, setContent] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const threadKey = messageKeys.thread(nickname)

  const profileQuery = useQuery({
    queryKey: userKeys.profile(nickname),
    queryFn: () => getPublicProfile(nickname),
  })

  const threadQuery = useQuery({
    queryKey: threadKey,
    queryFn: () => listThread(nickname),
  })

  // The GET already marked this thread read server-side; reflect that locally right away instead
  // of waiting for the next unrelated refetch of these two caches.
  useEffect(() => {
    if (!threadQuery.isSuccess) return
    queryClient.invalidateQueries({ queryKey: messageKeys.conversations })
    queryClient.invalidateQueries({ queryKey: messageKeys.unreadCount })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadQuery.isSuccess, threadQuery.dataUpdatedAt])

  const prepend = (message) => {
    queryClient.setQueryData(threadKey, (current) => {
      if (!current) return current
      return { ...current, items: [message, ...current.items] }
    })
  }

  const patch = (id, updater) => {
    queryClient.setQueryData(threadKey, (current) => {
      if (!current) return current
      return { ...current, items: current.items.map((item) => (item.id === id ? updater(item) : item)) }
    })
  }

  const { mutate: post, isPending: sending } = useMutation({
    mutationFn: () => sendMessage(nickname, { content: content.trim(), parentId: replyingTo?.id }),
    onSuccess: (message) => {
      prepend(message)
      setContent('')
      setReplyingTo(null)
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel enviar a mensagem.')),
  })

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => editMessage(editing.id, editContent.trim()),
    onSuccess: (message) => {
      patch(message.id, () => message)
      setEditing(null)
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel editar a mensagem.')),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id) => deleteMessage(id),
    onSuccess: (_data, id) => {
      patch(id, (item) => ({ ...item, deleted: true, content: null, canEdit: false, canDelete: false }))
      setConfirmDelete(null)
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel excluir a mensagem.')),
  })

  if (threadQuery.isPending || profileQuery.isPending) return <PageLoader label="Carregando conversa..." />

  if (threadQuery.isError || profileQuery.isError) {
    return (
      <ErrorState
        title="Conversa indisponivel"
        message={errorMessage(threadQuery.error || profileQuery.error, 'Este usuario nao existe.')}
        onRetry={() => {
          threadQuery.refetch()
          profileQuery.refetch()
        }}
      />
    )
  }

  const partner = profileQuery.data
  // The API returns newest-first; render oldest-first like any chat log.
  const messages = [...threadQuery.data.items].reverse()

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!content.trim()) return
    post()
  }

  const startEdit = (message) => {
    setEditing(message)
    setEditContent(message.content)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-8 sm:px-6">
      <header className="mb-4 flex items-center gap-3 border-b border-slate-800 pb-4">
        <Link to={`/users/${partner.nickname}`} className="flex items-center gap-3">
          <Avatar src={partner.image} name={partner.name} />
          <div>
            <p className="font-semibold text-slate-100">{partner.name}</p>
            <p className="text-xs text-slate-500">@{partner.nickname}</p>
          </div>
        </Link>
      </header>

      <div className="flex max-h-[60vh] min-h-[40vh] flex-col space-y-4 overflow-y-auto py-2">
        {messages.map((message) => {
          const mine = message.sender.id === user.id
          return (
            <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn('group max-w-[80%]', mine && 'text-right')}>
                {message.parent && (
                  <div className="mb-1 rounded-lg border-l-2 border-slate-600 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-400">
                    <span className="font-medium">{message.parent.senderName}</span>{' '}
                    {message.parent.deleted ? (
                      <span className="italic">mensagem apagada</span>
                    ) : (
                      <span className="line-clamp-1">{message.parent.content}</span>
                    )}
                  </div>
                )}

                {editing?.id === message.id ? (
                  <div className="space-y-2">
                    <Textarea
                      autoFocus
                      rows={2}
                      value={editContent}
                      onChange={(event) => setEditContent(event.target.value)}
                      maxLength={LIMITS.MESSAGE}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                        Cancelar
                      </Button>
                      <Button size="sm" loading={saving} disabled={!editContent.trim()} onClick={() => save()}>
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'inline-block rounded-2xl px-3.5 py-2 text-sm',
                      message.deleted
                        ? 'italic text-slate-500 border border-dashed border-slate-700'
                        : mine
                          ? 'rounded-br-sm bg-brand-500 text-white'
                          : 'rounded-bl-sm border border-slate-700 bg-slate-800 text-slate-100',
                    )}
                  >
                    {message.deleted ? 'Mensagem apagada' : message.content}
                  </div>
                )}

                <div
                  className={cn(
                    'mt-1 flex items-center gap-2 text-xs text-slate-500',
                    mine ? 'justify-end' : 'justify-start',
                  )}
                >
                  <time dateTime={message.createdAt} title={formatDateTime(message.createdAt)}>
                    {formatTime(message.createdAt)}
                  </time>
                  {message.edited && <span>(editado)</span>}

                  <span className="hidden items-center gap-2 group-hover:flex">
                    <button
                      type="button"
                      onClick={() => setReplyingTo(message)}
                      className="hover:text-brand-400"
                      aria-label="Responder"
                    >
                      <CornerUpLeft size={13} />
                    </button>
                    {message.canEdit && (
                      <button
                        type="button"
                        onClick={() => startEdit(message)}
                        className="hover:text-brand-400"
                        aria-label="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {message.canDelete && (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(message)}
                        className="hover:text-red-400"
                        aria-label="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-2 border-t border-slate-800 pt-4">
        {replyingTo && (
          <div className="flex items-center justify-between rounded-lg border-l-2 border-brand-500 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-400">
            <span>
              Respondendo <span className="font-medium">{replyingTo.sender.name}</span>:{' '}
              <span className="line-clamp-1">{replyingTo.deleted ? 'mensagem apagada' : replyingTo.content}</span>
            </span>
            <button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancelar resposta">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            rows={2}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Escreva uma mensagem..."
            maxLength={LIMITS.MESSAGE}
            className="flex-1"
          />
          <Button type="submit" loading={sending} disabled={!content.trim()}>
            Enviar
          </Button>
        </div>
      </form>

      <ConfirmModal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => remove(confirmDelete.id)}
        title="Excluir mensagem"
        message="Esta acao nao pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  )
}

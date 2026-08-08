import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Reply, ShieldOff, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { ConfirmModal } from '@/components/ui/Modal'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { banUser, courseKeys, createComment, deleteComment, listComments } from '@/api/courses'
import { errorMessage } from '@/lib/api'
import { LIMITS } from '@/lib/constants'
import { formatRelative } from '@/lib/format'

export function CommentThread({ courseId, isOwner }) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [replyingTo, setReplyingTo] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const { data: comments, isPending } = useQuery({
    queryKey: courseKeys.comments(courseId),
    queryFn: () => listComments(courseId),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: courseKeys.comments(courseId) })

  const { mutate: post, isPending: posting } = useMutation({
    mutationFn: ({ content, parentId }) => createComment(courseId, { content, parentId }),
    onSuccess: () => {
      setReplyingTo(null)
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel publicar o comentario.')),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id) => deleteComment(id),
    onSuccess: () => {
      setConfirm(null)
      invalidate()
      toast.success('Comentario excluido.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel excluir o comentario.')),
  })

  const { mutate: ban } = useMutation({
    mutationFn: (userId) => banUser(courseId, userId),
    onSuccess: () => {
      setConfirm(null)
      invalidate()
      toast.success('Usuario impedido de comentar neste curso.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel banir o usuario.')),
  })

  const total = comments?.reduce((sum, comment) => sum + 1 + comment.replies.length, 0) ?? 0

  return (
    <section className="space-y-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
        <MessageSquare size={20} className="text-brand-400" />
        Comentarios
        {total > 0 && <span className="text-sm font-normal text-slate-500">({total})</span>}
      </h2>

      {isAuthenticated ? (
        <CommentForm
          onSubmit={(content) => post({ content })}
          submitting={posting && replyingTo === null}
          placeholder="Escreva um comentario..."
        />
      ) : (
        <p className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-400">
          <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
            Entre na sua conta
          </Link>{' '}
          para comentar.
        </p>
      )}

      {isPending ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : comments.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nenhum comentario ainda"
          message="Seja a primeira pessoa a comentar neste curso."
        />
      ) : (
        <ul className="space-y-5">
          {comments.map((comment) => (
            <li key={comment.id}>
              <Comment
                comment={comment}
                isOwner={isOwner}
                canReply={isAuthenticated}
                onReply={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                onDelete={() => setConfirm({ type: 'delete', comment })}
                onBan={() => setConfirm({ type: 'ban', comment })}
              />

              {replyingTo === comment.id && (
                <div className="ml-11 mt-3">
                  <CommentForm
                    autoFocus
                    onSubmit={(content) => post({ content, parentId: comment.id })}
                    onCancel={() => setReplyingTo(null)}
                    submitting={posting}
                    placeholder={`Respondendo a ${comment.author.name}...`}
                  />
                </div>
              )}

              {comment.replies.length > 0 && (
                <ul className="ml-11 mt-4 space-y-4 border-l border-slate-700 pl-4">
                  {comment.replies.map((reply) => (
                    <li key={reply.id}>
                      <Comment
                        comment={reply}
                        isOwner={isOwner}
                        onDelete={() => setConfirm({ type: 'delete', comment: reply })}
                        onBan={() => setConfirm({ type: 'ban', comment: reply })}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={confirm?.type === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={() => remove(confirm.comment.id)}
        title="Excluir comentario"
        message="Esta acao nao pode ser desfeita."
        confirmLabel="Excluir"
      />
      <ConfirmModal
        open={confirm?.type === 'ban'}
        onClose={() => setConfirm(null)}
        onConfirm={() => ban(confirm.comment.author.id)}
        title={`Impedir ${confirm?.comment.author.name} de comentar`}
        message="A pessoa continua com acesso ao curso, mas nao podera publicar novos comentarios. Comentarios ja publicados permanecem."
        confirmLabel="Banir"
      />
    </section>
  )
}

function Comment({ comment, isOwner, canReply, onReply, onDelete, onBan }) {
  return (
    <article className="flex gap-3">
      <Link to={`/users/${comment.author.nickname}`} className="shrink-0">
        <Avatar src={comment.author.image} name={comment.author.name} />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <Link
            to={`/users/${comment.author.nickname}`}
            className="font-semibold text-slate-100 hover:text-brand-400"
          >
            {comment.author.name}
          </Link>
          <time dateTime={comment.createdAt} className="text-xs text-slate-500">
            {formatRelative(comment.createdAt)}
          </time>
        </div>

        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-300">
          {comment.content}
        </p>

        <div className="mt-2 flex items-center gap-3 text-xs">
          {canReply && onReply && (
            <button
              type="button"
              onClick={onReply}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300"
            >
              <Reply size={13} /> Responder
            </button>
          )}
          {comment.canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-red-400"
            >
              <Trash2 size={13} /> Excluir
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={onBan}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-amber-400"
            >
              <ShieldOff size={13} /> Banir
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function CommentForm({ onSubmit, onCancel, submitting, placeholder, autoFocus }) {
  const [content, setContent] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!content.trim()) return
    onSubmit(content.trim())
    setContent('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        rows={3}
        autoFocus={autoFocus}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={placeholder}
        maxLength={LIMITS.COMMENT}
        aria-label={placeholder}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="sm" loading={submitting} disabled={!content.trim()}>
          Publicar
        </Button>
      </div>
    </form>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Eye, EyeOff, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { CategoryInput } from '@/components/ui/CategoryInput'
import { ContentBadges } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { ImageUploadField } from '@/components/blocks/ImageUploadField'
import { BlockListEditor } from '@/components/blocks/BlockListEditor'
import { RelatedItemsEditor } from '@/components/related/RelatedItemsEditor'
import { useToast } from '@/context/ToastContext'
import { blockKeys } from '@/api/shared'
import {
  createPost,
  createPostBlock,
  deletePost,
  deletePostBlock,
  getPost,
  listPostBlocks,
  postKeys,
  reorderPostBlocks,
  updatePost,
  updatePostBlock,
} from '@/api/posts'
import { errorMessage, fieldErrors } from '@/lib/api'
import { LIMITS, STATUS, VISIBILITY } from '@/lib/constants'

const postBlockApi = {
  list: listPostBlocks,
  create: createPostBlock,
  update: updatePostBlock,
  remove: deletePostBlock,
  reorder: reorderPostBlocks,
}

/**
 * Handles both /posts/new and /posts/:id/edit. A new post has to exist before it can hold blocks,
 * so the first save creates it and the route switches to the edit form.
 */
export default function PostEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [errors, setErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    visibility: VISIBILITY.PUBLIC,
    categories: [],
  })

  const isNew = !id

  const { data: detail, isPending, isError, error, refetch } = useQuery({
    queryKey: postKeys.byId(id),
    queryFn: () => getPost(id),
    enabled: !isNew,
  })

  useEffect(() => {
    if (!detail) return
    const post = detail.summary
    setForm({
      title: post.title,
      description: post.description ?? '',
      thumbnailUrl: post.thumbnailUrl ?? '',
      visibility: post.visibility,
      categories: post.categories ?? [],
    })
  }, [detail])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: postKeys.all })
    if (id) queryClient.invalidateQueries({ queryKey: postKeys.byId(id) })
  }

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title.trim(),
        description: form.description,
        thumbnailUrl: form.thumbnailUrl,
        visibility: form.visibility,
        categories: form.categories,
      }
      return isNew ? createPost(payload) : updatePost(id, payload)
    },
    onSuccess: (post) => {
      setErrors({})
      invalidate()
      toast.success(isNew ? 'Post criado! Agora adicione o conteudo.' : 'Post salvo.')
      if (isNew) navigate(`/posts/${post.id}/edit`, { replace: true })
    },
    onError: (mutationError) => {
      setErrors(fieldErrors(mutationError))
      toast.error(errorMessage(mutationError, 'Nao foi possivel salvar o post.'))
    },
  })

  const { mutate: toggleStatus, isPending: togglingStatus } = useMutation({
    mutationFn: () =>
      updatePost(id, {
        status: detail.summary.status === STATUS.AVAILABLE ? STATUS.UNAVAILABLE : STATUS.AVAILABLE,
      }),
    onSuccess: (post) => {
      invalidate()
      toast.success(post.status === STATUS.AVAILABLE ? 'Post publicado.' : 'Post voltou para rascunho.')
    },
    onError: (mutationError) =>
      toast.error(errorMessage(mutationError, 'Nao foi possivel alterar o status.')),
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: () => deletePost(id),
    onSuccess: () => {
      invalidate()
      toast.success('Post excluido.')
      navigate('/posts')
    },
    onError: (mutationError) =>
      toast.error(errorMessage(mutationError, 'Nao foi possivel excluir o post.')),
  })

  if (!isNew && isPending) return <PageLoader label="Carregando post..." />

  if (!isNew && isError) {
    return (
      <ErrorState
        title="Nao foi possivel abrir o post"
        message={errorMessage(error, 'Este post nao existe ou nao e seu.')}
        onRetry={refetch}
      />
    )
  }

  const post = detail?.summary
  const published = post?.status === STATUS.AVAILABLE

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-100">
            {isNew ? 'Novo post' : 'Editar post'}
          </h1>
          {post && (
            <p className="truncate text-xs text-slate-500">
              /posts/{post.owner.nickname}/{post.slug}
            </p>
          )}
        </div>

        {post && (
          <>
            <ContentBadges
              status={post.status}
              visibility={post.visibility}
              featured={post.featured}
            />
            <Link
              to={`/posts/${post.owner.nickname}/${post.slug}`}
              className="btn-ghost ml-auto text-xs"
            >
              <ExternalLink size={14} /> Ver publicado
            </Link>
          </>
        )}
      </header>

      <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
        <Field label="Titulo" htmlFor="post-title" error={errors.title} required>
          <Input
            id="post-title"
            autoFocus={isNew}
            maxLength={LIMITS.TITLE}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Ex.: Como funciona o garbage collector do Java"
            invalid={Boolean(errors.title)}
          />
        </Field>

        <Field label="Descricao" htmlFor="post-description" error={errors.description}>
          <Textarea
            id="post-description"
            rows={3}
            maxLength={LIMITS.DESCRIPTION}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Resumo que aparece nos cards e na busca."
          />
        </Field>

        <Field label="Thumbnail" error={errors.thumbnailUrl}>
          <ImageUploadField
            value={form.thumbnailUrl}
            onChange={(thumbnailUrl) => setForm({ ...form, thumbnailUrl })}
          />
        </Field>

        <Field label="Categorias">
          <CategoryInput
            value={form.categories}
            onChange={(categories) => setForm({ ...form, categories })}
          />
        </Field>

        <Field label="Visibilidade" htmlFor="post-visibility">
          <Select
            id="post-visibility"
            value={form.visibility}
            onChange={(event) => setForm({ ...form, visibility: event.target.value })}
          >
            <option value={VISIBILITY.PUBLIC}>Publico</option>
            <option value={VISIBILITY.PRIVATE}>Privado</option>
          </Select>
        </Field>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {!isNew && (
            <>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn-danger mr-auto text-sm"
              >
                <Trash2 size={15} /> Excluir
              </button>
              <Button variant="secondary" loading={togglingStatus} onClick={() => toggleStatus()}>
                {published ? (
                  <>
                    <EyeOff size={16} /> Voltar para rascunho
                  </>
                ) : (
                  <>
                    <Eye size={16} /> Publicar
                  </>
                )}
              </Button>
            </>
          )}
          <Button loading={saving} onClick={() => save()} disabled={!form.title.trim()}>
            <Save size={16} /> {isNew ? 'Criar post' : 'Salvar'}
          </Button>
        </div>
      </section>

      {isNew ? (
        <p className="rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-500">
          Salve o post para comecar a adicionar blocos de conteudo.
        </p>
      ) : (
        <>
          <section>
            <h2 className="mb-4 text-lg font-bold text-slate-100">Conteudo</h2>
            <BlockListEditor
              parentId={id}
              api={postBlockApi}
              queryKey={blockKeys.post(id)}
              emptyMessage="Adicione texto, codigo, imagens ou videos a este post."
            />
          </section>

          <RelatedItemsEditor kind="post" contentId={id} />
        </>
      )}

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove()}
        loading={deleting}
        title="Excluir post"
        message="Os blocos e as curtidas deste post serao excluidos junto. Esta acao nao pode ser desfeita."
        confirmLabel="Excluir definitivamente"
      />
    </div>
  )
}

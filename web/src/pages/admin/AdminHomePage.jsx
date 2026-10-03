import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { ConfirmModal } from '@/components/ui/Modal'
import { EmptyState, PageLoader } from '@/components/ui/Feedback'
import { HomePicksEditor } from '@/components/admin/HomePicksEditor'
import { useToast } from '@/context/ToastContext'
import { adminKeys, getHomePicks } from '@/api/admin'
import {
  createTestimonial,
  deleteTestimonial,
  getSiteSettings,
  homeKeys,
  listAllTestimonials,
  updateSiteSettings,
  updateTestimonial,
} from '@/api/home'
import { listCourses } from '@/api/courses'
import { listPosts } from '@/api/posts'
import { listTrilhas } from '@/api/trilhas'
import { listSchools, schoolKeys } from '@/api/schools'
import { errorMessage } from '@/lib/api'

const BLANK_TESTIMONIAL = { authorName: '', authorRole: '', authorImage: '', quote: '' }

/**
 * Admin-only: the parts of the landing page that cannot be derived from real data. Everything else
 * there - the counters and the area grid - comes straight from the database, so it is deliberately
 * not editable here. Which courses/posts/trilhas/schools appear is chosen in the "Conteudo em
 * destaque" section below, backed by {@code GET/PUT /admin/home-picks}.
 */
export default function AdminHomePage() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: settings, isPending } = useQuery({ queryKey: homeKeys.settings, queryFn: getSiteSettings })
  const { data: testimonials } = useQuery({ queryKey: homeKeys.allTestimonials, queryFn: listAllTestimonials })
  const { data: picks, isPending: picksPending } = useQuery({
    queryKey: adminKeys.homePicks,
    queryFn: getHomePicks,
  })
  const { data: schools } = useQuery({ queryKey: schoolKeys.list(), queryFn: listSchools })

  const [form, setForm] = useState(null)
  useEffect(() => {
    if (settings && !form) {
      setForm({
        heroTitle: settings.heroTitle ?? '',
        heroHighlight: settings.heroHighlight ?? '',
        heroSubtitle: settings.heroSubtitle ?? '',
        heroCtaLabel: settings.heroCtaLabel ?? '',
        heroCtaHref: settings.heroCtaHref ?? '',
        announcement: settings.announcement ?? '',
        announcementHref: settings.announcementHref ?? '',
      })
    }
  }, [settings, form])

  const invalidateHome = () => {
    queryClient.invalidateQueries({ queryKey: ['home'] })
  }

  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: () => updateSiteSettings(form),
    onSuccess: () => {
      invalidateHome()
      toast.success('Home atualizada.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel salvar.')),
  })

  if (isPending || !form) return <PageLoader label="Carregando configuracoes..." />

  const setField = (patch) => setForm((current) => ({ ...current, ...patch }))

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Personalizar home</h1>
        <p className="mt-1 text-sm text-slate-400">
          Os numeros, as areas e os destaques da home vem direto do banco. Aqui ficam so os textos e
          os depoimentos.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
        <h2 className="font-bold text-slate-100">Topo da pagina</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titulo" htmlFor="hero-title" hint="A primeira parte, em branco.">
            <Input
              id="hero-title"
              maxLength={200}
              value={form.heroTitle}
              onChange={(event) => setField({ heroTitle: event.target.value })}
              placeholder="Aprenda e ensine"
            />
          </Field>
          <Field label="Destaque" htmlFor="hero-highlight" hint="Continua o titulo, na cor de destaque.">
            <Input
              id="hero-highlight"
              maxLength={80}
              value={form.heroHighlight}
              onChange={(event) => setField({ heroHighlight: event.target.value })}
              placeholder="o que quiser"
            />
          </Field>
        </div>

        <Field label="Subtitulo" htmlFor="hero-subtitle">
          <Textarea
            id="hero-subtitle"
            rows={2}
            maxLength={400}
            value={form.heroSubtitle}
            onChange={(event) => setField({ heroSubtitle: event.target.value })}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Texto do botao" htmlFor="cta-label">
            <Input
              id="cta-label"
              maxLength={60}
              value={form.heroCtaLabel}
              onChange={(event) => setField({ heroCtaLabel: event.target.value })}
              placeholder="Explorar conteudo"
            />
          </Field>
          <Field label="Link do botao" htmlFor="cta-href" hint="Padrao: /pesquisar">
            <Input
              id="cta-href"
              maxLength={2000}
              value={form.heroCtaHref}
              onChange={(event) => setField({ heroCtaHref: event.target.value })}
              placeholder="/pesquisar"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
        <div>
          <h2 className="font-bold text-slate-100">Barra de aviso</h2>
          <p className="mt-1 text-sm text-slate-400">
            Aparece acima de tudo. Deixe em branco para esconder.
          </p>
        </div>
        <Field label="Texto" htmlFor="announcement">
          <Input
            id="announcement"
            maxLength={300}
            value={form.announcement}
            onChange={(event) => setField({ announcement: event.target.value })}
            placeholder="Ex.: Novos cursos de Xadrez publicados esta semana"
          />
        </Field>
        <Field label="Link (opcional)" htmlFor="announcement-href">
          <Input
            id="announcement-href"
            maxLength={2000}
            value={form.announcementHref}
            onChange={(event) => setField({ announcementHref: event.target.value })}
            placeholder="/pesquisar?area=jogos"
          />
        </Field>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => saveSettings()} loading={saving}>
          <Save size={16} /> Salvar textos
        </Button>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Conteudo em destaque</h2>
          <p className="mt-1 text-sm text-slate-400">
            Escolha exatamente o que aparece na home em cada categoria, e em que ordem. Sem nada
            escolhido numa categoria, a home mostra os itens mais recentes dela.
          </p>
        </div>
        {picksPending ? (
          <PageLoader label="Carregando destaques..." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <HomePicksEditor
              kind="courses"
              title="Cursos"
              emptyHint="Nada escolhido - a home mostra os cursos mais recentes."
              items={picks.courses}
              normalize={(course) => ({
                id: course.id,
                title: course.name,
                subtitle: `@${course.owner.nickname}`,
              })}
              search={(q) => listCourses({ q, page: 0, size: 8 }).then((result) => result.items)}
            />
            <HomePicksEditor
              kind="posts"
              title="Posts"
              emptyHint="Nada escolhido - a home mostra os posts mais recentes."
              items={picks.posts}
              normalize={(post) => ({
                id: post.id,
                title: post.title,
                subtitle: `@${post.owner.nickname}`,
              })}
              search={(q) => listPosts({ q, page: 0, size: 8 }).then((result) => result.items)}
            />
            <HomePicksEditor
              kind="trilhas"
              title="Trilhas"
              emptyHint="Nada escolhido - a home mostra as trilhas mais recentes."
              items={picks.trilhas}
              normalize={(trilha) => ({
                id: trilha.id,
                title: trilha.title,
                subtitle: `@${trilha.owner.nickname}`,
              })}
              search={(q) => listTrilhas({ q, page: 0, size: 8 }).then((result) => result.items)}
            />
            <HomePicksEditor
              kind="schools"
              title="Escolas"
              emptyHint="Nada escolhido - a home mostra todas as escolas."
              items={picks.schools}
              normalize={(school) => ({
                id: school.id,
                title: school.name,
                subtitle: school.description ?? '',
              })}
              search={(q) =>
                Promise.resolve(
                  (schools ?? [])
                    .filter((school) => school.name.toLowerCase().includes(q.toLowerCase()))
                    .slice(0, 8),
                )
              }
            />
          </div>
        )}
      </section>

      <TestimonialsManager testimonials={testimonials} onChanged={invalidateHome} />
    </div>
  )
}

function TestimonialsManager({ testimonials, onChanged }) {
  const toast = useToast()
  const [draft, setDraft] = useState(BLANK_TESTIMONIAL)
  const [editingId, setEditingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const done = (message) => {
    onChanged()
    toast.success(message)
  }

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: () => createTestimonial(draft),
    onSuccess: () => {
      setDraft(BLANK_TESTIMONIAL)
      done('Depoimento adicionado.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel adicionar.')),
  })

  const { mutate: save } = useMutation({
    mutationFn: ({ id, patch }) => updateTestimonial(id, patch),
    onSuccess: () => {
      setEditingId(null)
      done('Depoimento atualizado.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel atualizar.')),
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: () => deleteTestimonial(confirmDelete.id),
    onSuccess: () => {
      setConfirmDelete(null)
      done('Depoimento excluido.')
    },
    onError: (error) => {
      setConfirmDelete(null)
      toast.error(errorMessage(error, 'Nao foi possivel excluir.'))
    },
  })

  const canCreate = draft.authorName.trim() && draft.quote.trim()

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Depoimentos</h2>
        <p className="mt-1 text-sm text-slate-400">
          A secao de depoimentos so aparece na home quando ha pelo menos um publicado.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/40 p-5">
        <h3 className="text-sm font-semibold text-slate-300">Novo depoimento</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" htmlFor="t-name" required>
            <Input
              id="t-name"
              maxLength={120}
              value={draft.authorName}
              onChange={(event) => setDraft({ ...draft, authorName: event.target.value })}
              placeholder="Ex.: Juliana Amoasei"
            />
          </Field>
          <Field label="Descricao" htmlFor="t-role">
            <Input
              id="t-role"
              maxLength={160}
              value={draft.authorRole}
              onChange={(event) => setDraft({ ...draft, authorRole: event.target.value })}
              placeholder="Ex.: Professora"
            />
          </Field>
        </div>
        <Field label="Foto (URL)" htmlFor="t-image">
          <Input
            id="t-image"
            type="url"
            maxLength={2000}
            value={draft.authorImage}
            onChange={(event) => setDraft({ ...draft, authorImage: event.target.value })}
            placeholder="https://..."
          />
        </Field>
        <Field label="Depoimento" htmlFor="t-quote" required>
          <Textarea
            id="t-quote"
            rows={3}
            maxLength={2000}
            value={draft.quote}
            onChange={(event) => setDraft({ ...draft, quote: event.target.value })}
          />
        </Field>
        <div className="flex justify-end">
          <Button onClick={() => create()} loading={creating} disabled={!canCreate}>
            <Plus size={16} /> Adicionar
          </Button>
        </div>
      </div>

      {!testimonials?.length ? (
        <EmptyState title="Nenhum depoimento ainda" message="Adicione o primeiro acima." />
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700">
          {testimonials.map((testimonial) => (
            <li key={testimonial.id} className="p-4">
              {editingId === testimonial.id ? (
                <InlineEditor
                  testimonial={testimonial}
                  onCancel={() => setEditingId(null)}
                  onSave={(patch) => save({ id: testimonial.id, patch })}
                />
              ) : (
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200">
                      {testimonial.authorName}
                      {testimonial.authorRole && (
                        <span className="font-normal text-slate-500"> · {testimonial.authorRole}</span>
                      )}
                      {!testimonial.published && (
                        <span className="badge ml-2 bg-slate-700 text-slate-400">Rascunho</span>
                      )}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">{testimonial.quote}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => save({ id: testimonial.id, patch: { published: !testimonial.published } })}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    aria-label={testimonial.published ? 'Despublicar' : 'Publicar'}
                    title={testimonial.published ? 'Despublicar' : 'Publicar'}
                  >
                    {testimonial.published ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(testimonial.id)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    aria-label="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(testimonial)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-red-400"
                    aria-label="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => remove()}
        loading={deleting}
        title="Excluir depoimento"
        message={`Excluir o depoimento de "${confirmDelete?.authorName}"?`}
        confirmLabel="Excluir"
      />
    </section>
  )
}

function InlineEditor({ testimonial, onCancel, onSave }) {
  const [name, setName] = useState(testimonial.authorName)
  const [role, setRole] = useState(testimonial.authorRole ?? '')
  const [quote, setQuote] = useState(testimonial.quote)

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} />
        <Input value={role} maxLength={160} onChange={(event) => setRole(event.target.value)} />
      </div>
      <Textarea rows={3} maxLength={2000} value={quote} onChange={(event) => setQuote(event.target.value)} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          <X size={15} /> Cancelar
        </Button>
        <Button
          onClick={() => onSave({ authorName: name.trim(), authorRole: role, quote: quote.trim() })}
          disabled={!name.trim() || !quote.trim()}
        >
          <Save size={15} /> Salvar
        </Button>
      </div>
    </div>
  )
}

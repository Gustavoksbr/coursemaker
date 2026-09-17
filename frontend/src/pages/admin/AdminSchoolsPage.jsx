import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, Plus, Trash2, UserMinus, UserPlus, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState, PageLoader } from '@/components/ui/Feedback'
import { useToast } from '@/context/ToastContext'
import { useDebounce } from '@/hooks/useDebounce'
import {
  createSchool,
  deleteSchool,
  getSchoolWithMembers,
  grantSchoolMembership,
  listSchools,
  revokeSchoolMembership,
  schoolKeys,
  updateSchool,
} from '@/api/schools'
import { searchUsers } from '@/api/users'
import { errorMessage } from '@/lib/api'
import { LIMITS } from '@/lib/constants'

const BLANK_FORM = { name: '', description: '', logoUrl: '', websiteUrl: '' }

/**
 * Admin-only: curates the fixed list of schools and decides who is allowed to publish under each
 * one. Content owners never create schools themselves - they only pick one they were granted here.
 */
export default function AdminSchoolsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [newSchool, setNewSchool] = useState(BLANK_FORM)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(BLANK_FORM)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [membersSchool, setMembersSchool] = useState(null)

  const { data: schools, isPending } = useQuery({ queryKey: schoolKeys.list(), queryFn: listSchools })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: schoolKeys.all })

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: () => createSchool(toPayload(newSchool)),
    onSuccess: () => {
      setNewSchool(BLANK_FORM)
      invalidate()
      toast.success('Escola criada.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel criar a escola.')),
  })

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => updateSchool(editingId, toPayload(editForm)),
    onSuccess: () => {
      setEditingId(null)
      invalidate()
      toast.success('Escola atualizada.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel atualizar a escola.')),
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: () => deleteSchool(confirmDelete.id),
    onSuccess: () => {
      setConfirmDelete(null)
      invalidate()
      toast.success('Escola excluida. O conteudo associado perdeu a atribuicao, mas continua existindo.')
    },
    onError: (error) => {
      setConfirmDelete(null)
      toast.error(errorMessage(error, 'Nao foi possivel excluir a escola.'))
    },
  })

  const startEditing = (school) => {
    setEditingId(school.id)
    setEditForm({
      name: school.name,
      description: school.description ?? '',
      logoUrl: school.logoUrl ?? '',
      websiteUrl: school.websiteUrl ?? '',
    })
  }

  if (isPending) return <PageLoader label="Carregando escolas..." />

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Gerenciar escolas</h1>
        <p className="mt-1 text-sm text-slate-400">
          Escolas sao credito de procedencia, nao parceria oficial. Conceda associacao a um usuario
          para que ele possa publicar conteudo em nome de uma escola. Para escolher quais aparecem
          na home, use{' '}
          <Link to="/admin/home" className="text-brand-400 hover:underline">
            Personalizar home
          </Link>
          .
        </p>
      </div>

      <form
        className="space-y-3 rounded-xl border border-slate-700 p-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (newSchool.name.trim()) create()
        }}
      >
        <h2 className="text-sm font-semibold text-slate-200">Nova escola</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" htmlFor="new-school-name">
            <Input
              id="new-school-name"
              maxLength={LIMITS.NAME}
              value={newSchool.name}
              onChange={(event) => setNewSchool({ ...newSchool, name: event.target.value })}
              placeholder="Ex.: Alura"
            />
          </Field>
          <Field label="Logo (URL)" htmlFor="new-school-logo">
            <Input
              id="new-school-logo"
              type="url"
              maxLength={LIMITS.URL}
              value={newSchool.logoUrl}
              onChange={(event) => setNewSchool({ ...newSchool, logoUrl: event.target.value })}
              placeholder="https://..."
            />
          </Field>
        </div>
        <Field label="Site (URL)" htmlFor="new-school-website">
          <Input
            id="new-school-website"
            type="url"
            maxLength={LIMITS.URL}
            value={newSchool.websiteUrl}
            onChange={(event) => setNewSchool({ ...newSchool, websiteUrl: event.target.value })}
            placeholder="https://..."
          />
        </Field>
        <Field label="Descricao" htmlFor="new-school-description">
          <Textarea
            id="new-school-description"
            rows={2}
            maxLength={LIMITS.DESCRIPTION}
            value={newSchool.description}
            onChange={(event) => setNewSchool({ ...newSchool, description: event.target.value })}
            placeholder="Uma ou duas frases sobre a escola."
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" loading={creating} disabled={!newSchool.name.trim()}>
            <Plus size={16} /> Criar escola
          </Button>
        </div>
      </form>

      {schools.length === 0 ? (
        <EmptyState title="Nenhuma escola ainda" message="Crie a primeira escola acima." />
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700">
          {schools.map((school) => (
            <li key={school.id} className="space-y-3 px-4 py-3">
              {editingId === school.id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      autoFocus
                      maxLength={LIMITS.NAME}
                      value={editForm.name}
                      onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                      placeholder="Nome"
                    />
                    <Input
                      type="url"
                      maxLength={LIMITS.URL}
                      value={editForm.logoUrl}
                      onChange={(event) => setEditForm({ ...editForm, logoUrl: event.target.value })}
                      placeholder="Logo (URL)"
                    />
                  </div>
                  <Input
                    type="url"
                    maxLength={LIMITS.URL}
                    value={editForm.websiteUrl}
                    onChange={(event) => setEditForm({ ...editForm, websiteUrl: event.target.value })}
                    placeholder="Site (URL)"
                  />
                  <Textarea
                    rows={2}
                    maxLength={LIMITS.DESCRIPTION}
                    value={editForm.description}
                    onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                    placeholder="Descricao"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      <X size={14} /> Cancelar
                    </Button>
                    <Button
                      size="sm"
                      loading={saving}
                      disabled={!editForm.name.trim()}
                      onClick={() => save()}
                    >
                      <Check size={14} /> Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {school.logoUrl ? (
                    <img src={school.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="h-8 w-8 shrink-0 rounded bg-slate-700" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">{school.name}</p>
                    {school.description && (
                      <p className="truncate text-xs text-slate-500">{school.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMembersSchool(school)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    aria-label="Gerenciar membros"
                    title="Gerenciar membros"
                  >
                    <Users size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditing(school)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    aria-label="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(school)}
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
        title="Excluir escola"
        message={`Excluir "${confirmDelete?.name}"? O conteudo ja publicado com essa escola perde a atribuicao, mas continua existindo.`}
        confirmLabel="Excluir"
      />

      <MembersModal school={membersSchool} onClose={() => setMembersSchool(null)} />
    </div>
  )
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    logoUrl: form.logoUrl.trim() || undefined,
    websiteUrl: form.websiteUrl.trim() || undefined,
  }
}

/** Who is allowed to publish under this school - grant by nickname search, revoke with one click. */
function MembersModal({ school, onClose }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [q, setQ] = useState('')
  const debouncedQ = useDebounce(q, 300)

  const { data, isPending } = useQuery({
    queryKey: schoolKeys.withMembers(school?.id),
    queryFn: () => getSchoolWithMembers(school.id),
    enabled: Boolean(school),
  })

  const { data: results } = useQuery({
    queryKey: ['users', 'search', debouncedQ],
    queryFn: () => searchUsers({ q: debouncedQ, page: 0, size: 6 }),
    enabled: Boolean(school) && debouncedQ.trim().length > 0,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: schoolKeys.withMembers(school.id) })

  const { mutate: grant } = useMutation({
    mutationFn: (userId) => grantSchoolMembership(school.id, userId),
    onSuccess: () => {
      setQ('')
      invalidate()
      toast.success('Membro adicionado.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel adicionar o membro.')),
  })

  const { mutate: revoke } = useMutation({
    mutationFn: (userId) => revokeSchoolMembership(school.id, userId),
    onSuccess: () => {
      invalidate()
      toast.success('Membro removido.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel remover o membro.')),
  })

  const memberIds = new Set((data?.members ?? []).map((member) => member.id))
  const candidates = (results?.items ?? []).filter((person) => !memberIds.has(person.id))

  return (
    <Modal
      open={Boolean(school)}
      onClose={onClose}
      title={`Membros de ${school?.name ?? ''}`}
      description="Quem pode publicar conteudo em nome desta escola"
      size="md"
    >
      <div className="space-y-4">
        <Field label="Adicionar por nickname" htmlFor="member-search">
          <Input
            id="member-search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar usuario..."
          />
        </Field>

        {candidates.length > 0 && (
          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-700">
            {candidates.map((person) => (
              <li key={person.id} className="flex items-center gap-2 px-3 py-2">
                <Avatar src={person.image} name={person.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-200">{person.name}</p>
                  <p className="truncate text-xs text-slate-500">@{person.nickname}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => grant(person.id)}>
                  <UserPlus size={14} /> Adicionar
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Membros atuais</p>
          {isPending ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : data?.members.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum membro ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-800 rounded-lg border border-slate-700">
              {data.members.map((member) => (
                <li key={member.id} className="flex items-center gap-2 px-3 py-2">
                  <Avatar src={member.image} name={member.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-200">{member.name}</p>
                    <p className="truncate text-xs text-slate-500">@{member.nickname}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => revoke(member.id)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-red-400"
                    aria-label="Remover"
                    title="Remover"
                  >
                    <UserMinus size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}

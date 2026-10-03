import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, Lock, Save } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { CategoryInput } from '@/components/ui/CategoryInput'
import { Modal } from '@/components/ui/Modal'
import { UnsavedChangesPrompt } from '@/components/ui/UnsavedChangesPrompt'
import { ImageUploadField } from '@/components/blocks/ImageUploadField'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard'
import { deleteAccount, updateProfile } from '@/api/users'
import { errorMessage, fieldErrors } from '@/lib/api'
import { LIMITS } from '@/lib/constants'
import { cn } from '@/lib/cn'

function baselineFrom(user) {
  return {
    name: user.name ?? '',
    bio: user.bio ?? '',
    image: user.image ?? '',
    stacks: user.stacks ?? [],
  }
}

function sameStacks(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const [errors, setErrors] = useState({})
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [form, setForm] = useState(() => baselineFrom(user))

  // A real diff against the last-saved values, not a "was anything typed" flag - typing
  // something and then undoing it back to the original goes dirty then clean again. Mirrors
  // useCourseSettingsDraft's isDirty, which drives the same gray/blue save button there.
  const baseline = baselineFrom(user)
  const isDirty =
    form.name !== baseline.name ||
    form.bio !== baseline.bio ||
    form.image !== baseline.image ||
    !sameStacks(form.stacks, baseline.stacks)

  const blocker = useUnsavedChangesGuard(isDirty)

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      updateProfile(user.id, {
        name: form.name.trim(),
        bio: form.bio,
        image: form.image,
        stacks: form.stacks,
      }),
    onSuccess: (updated) => {
      setErrors({})
      refreshUser(updated)
      toast.success('Perfil atualizado.')
    },
    onError: (error) => {
      setErrors(fieldErrors(error))
      toast.error(errorMessage(error, 'Nao foi possivel salvar o perfil.'))
    },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex items-center gap-4">
        <Avatar src={form.image || user.image} name={form.name || user.name} size="lg" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-100">Editar perfil</h1>
          {user.nickname && (
            <Link
              to={`/users/${user.nickname}`}
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              Ver perfil publico
            </Link>
          )}
        </div>
      </header>

      <form
        className="space-y-5 rounded-xl border border-slate-700 bg-slate-800/40 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <Field
          label="Nickname"
          hint="O nickname faz parte das suas URLs publicas e nao pode ser alterado."
        >
          <div className="relative">
            <Input value={user.nickname ?? ''} disabled className="pr-10 font-mono text-sm" />
            <Lock
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
            />
          </div>
        </Field>

        <Field label="Email" hint="Usado para entrar na sua conta.">
          <Input value={user.email} disabled className="text-sm" />
        </Field>

        <Field
          label="Nome"
          htmlFor="profile-name"
          error={errors.name}
          required
          value={form.name}
          maxLength={LIMITS.NAME}
        >
          <Input
            id="profile-name"
            maxLength={LIMITS.NAME}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            invalid={Boolean(errors.name)}
          />
        </Field>

        <Field
          label="Bio"
          htmlFor="profile-bio"
          error={errors.bio}
          value={form.bio}
          maxLength={LIMITS.BIO}
        >
          <Textarea
            id="profile-bio"
            rows={4}
            maxLength={LIMITS.BIO}
            value={form.bio}
            onChange={(event) => setForm({ ...form, bio: event.target.value })}
            placeholder="Conte um pouco sobre voce."
          />
        </Field>

        <Field label="Foto de perfil" error={errors.image}>
          <ImageUploadField value={form.image} onChange={(image) => setForm({ ...form, image })} />
        </Field>

        <Field label="Stacks" hint="Tecnologias com as quais voce trabalha ou tem interesse.">
          <CategoryInput
            value={form.stacks}
            onChange={(stacks) => setForm({ ...form, stacks })}
            placeholder="Adicionar stack..."
          />
        </Field>

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={isPending}
            disabled={!isDirty || !form.name.trim()}
            title={isDirty ? undefined : 'Faca uma alteracao para poder salvar'}
            className={cn(!isDirty && 'bg-slate-700 text-slate-400 hover:bg-slate-700')}
          >
            <Save size={16} /> Salvar perfil
          </Button>
        </div>
      </form>

      <UnsavedChangesPrompt blocker={blocker} />

      <section className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle size={18} />
          <h2 className="font-semibold">Zona de risco</h2>
        </div>
        <p className="text-sm text-slate-400">
          Excluir sua conta remove seu email, foto, bio e stacks permanentemente. Cursos, posts e
          trilhas que voce publicou continuam no ar (para nao afetar quem ja estuda por eles), mas
          aparecem como de um "Usuario excluido". Isso nao pode ser desfeito.
        </p>
        <Button variant="danger" onClick={() => setDeleteOpen(true)}>
          Excluir minha conta
        </Button>
      </section>

      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} nickname={user.nickname} />
    </div>
  )
}

function DeleteAccountModal({ open, onClose, nickname }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const toast = useToast()
  const [confirmText, setConfirmText] = useState('')

  const { mutate: remove, isPending } = useMutation({
    mutationFn: () => deleteAccount(confirmText.trim()),
    onSuccess: () => {
      logout()
      toast.success('Conta excluida.')
      navigate('/', { replace: true })
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel excluir a conta.')),
  })

  const handleClose = () => {
    setConfirmText('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Excluir sua conta"
      description="Essa acao e permanente e nao pode ser desfeita."
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          Para confirmar, digite seu nickname{' '}
          <span className="font-mono font-semibold text-slate-100">{nickname}</span> abaixo.
        </p>
        <Input
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={nickname}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={isPending}
            disabled={confirmText.trim().toLowerCase() !== nickname?.toLowerCase()}
            onClick={() => remove()}
          >
            Excluir permanentemente
          </Button>
        </div>
      </div>
    </Modal>
  )
}

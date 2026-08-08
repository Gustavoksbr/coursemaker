import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Lock, Save } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { CategoryInput } from '@/components/ui/CategoryInput'
import { ImageUploadField } from '@/components/blocks/ImageUploadField'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { updateProfile } from '@/api/users'
import { errorMessage, fieldErrors } from '@/lib/api'
import { LIMITS } from '@/lib/constants'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    name: user.name ?? '',
    bio: user.bio ?? '',
    image: user.image ?? '',
    stacks: user.stacks ?? [],
  })

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

        <Field label="Nome" htmlFor="profile-name" error={errors.name} required>
          <Input
            id="profile-name"
            maxLength={LIMITS.NAME}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            invalid={Boolean(errors.name)}
          />
        </Field>

        <Field label="Bio" htmlFor="profile-bio" error={errors.bio}>
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
          <Button type="submit" loading={isPending} disabled={!form.name.trim()}>
            <Save size={16} /> Salvar perfil
          </Button>
        </div>
      </form>
    </div>
  )
}

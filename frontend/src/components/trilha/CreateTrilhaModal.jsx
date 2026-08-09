import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/context/ToastContext'
import { useDebounce } from '@/hooks/useDebounce'
import { checkTrilhaSlug, createTrilha, trilhaKeys } from '@/api/trilhas'
import { errorMessage, fieldErrors } from '@/lib/api'
import { LIMITS } from '@/lib/constants'

const BLANK = { title: '', slug: '' }

/** Trilha creation is a single step: just a title. Everything else is filled in on the editor. */
export function CreateTrilhaModal({ open, onClose }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [slugCheck, setSlugCheck] = useState(null)
  const [checking, setChecking] = useState(false)

  const debouncedTitle = useDebounce(form.title, 300)

  useEffect(() => {
    if (!open) {
      setForm(BLANK)
      setErrors({})
      setSlugCheck(null)
    }
  }, [open])

  useEffect(() => {
    if (!open || !debouncedTitle.trim()) {
      setSlugCheck(null)
      return undefined
    }
    let cancelled = false
    setChecking(true)
    checkTrilhaSlug(debouncedTitle)
      .then((result) => {
        if (!cancelled) setSlugCheck(result)
      })
      .catch(() => {
        if (!cancelled) setSlugCheck(null)
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedTitle, open])

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      createTrilha({
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
      }),
    onSuccess: (trilha) => {
      queryClient.invalidateQueries({ queryKey: trilhaKeys.all })
      toast.success('Trilha criada! Agora monte a sequencia.')
      onClose()
      navigate(`/trilhas/${trilha.owner.nickname}/${trilha.slug}/edit`)
    },
    onError: (error) => {
      setErrors(fieldErrors(error))
      toast.error(errorMessage(error, 'Nao foi possivel criar a trilha.'))
    },
  })

  const effectiveSlug = form.slug.trim() || slugCheck?.suggestion || ''
  const canSubmit = form.title.trim().length > 0

  return (
    <Modal open={open} onClose={onClose} title="Criar trilha" size="md">
      <div className="space-y-4">
        <Field label="Nome da trilha" htmlFor="trilha-title" error={errors.title} required>
          <Input
            id="trilha-title"
            autoFocus
            maxLength={LIMITS.NAME}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Ex.: Do zero ao backend com Java"
            invalid={Boolean(errors.title)}
          />
        </Field>

        <Field
          label="URL da trilha"
          htmlFor="trilha-slug"
          error={errors.slug}
          hint="Deixe em branco para usar a sugestao automatica."
        >
          <div className="relative">
            <Input
              id="trilha-slug"
              maxLength={LIMITS.SLUG}
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
              placeholder={slugCheck?.suggestion || 'sera-gerado-do-nome'}
              className="pr-10 font-mono text-xs"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {checking && <Loader2 size={16} className="animate-spin text-slate-500" />}
              {!checking && slugCheck?.available && <Check size={16} className="text-green-400" />}
              {!checking && slugCheck && !slugCheck.available && <X size={16} className="text-amber-400" />}
            </span>
          </div>
        </Field>

        {effectiveSlug && (
          <p className="break-all text-xs text-slate-500">
            Ficara em <span className="font-mono text-slate-400">/trilhas/voce/{effectiveSlug}</span>
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => submit()} loading={isPending} disabled={!canSubmit}>
            Criar trilha
          </Button>
        </div>
      </div>
    </Modal>
  )
}

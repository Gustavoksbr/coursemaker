import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { CategoryInput } from '@/components/ui/CategoryInput'
import { AreaSelect } from '@/components/ui/AreaSelect'
import { SchoolSelect } from '@/components/ui/SchoolSelect'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useDebounce } from '@/hooks/useDebounce'
import { checkCourseSlug, courseKeys, createCourse } from '@/api/courses'
import { errorMessage, fieldErrors } from '@/lib/api'
import { courseHref } from '@/lib/contentLinks'
import { LIMITS, VISIBILITY } from '@/lib/constants'

const BLANK = {
  name: '',
  slug: '',
  description: '',
  thumbnailUrl: '',
  visibility: VISIBILITY.PUBLIC,
  password: '',
  categories: [],
  progressEnabled: false,
  areaId: '',
  schoolId: '',
}

/**
 * Two-step course creation: name + slug first (with live availability), then the rest.
 * The course is created as a draft, and the user lands straight in its editor.
 */
export function CreateCourseModal({ open, onClose }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [slugCheck, setSlugCheck] = useState(null)
  const [checking, setChecking] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  const isDirty = JSON.stringify(form) !== JSON.stringify(BLANK)

  /** Backdrop click, Escape, the X and "Cancelar" all funnel through here so none of them silently
   *  discard a filled-in form. */
  const requestClose = () => {
    if (isDirty) setConfirmCloseOpen(true)
    else onClose()
  }

  const debouncedName = useDebounce(form.name, 300)

  useEffect(() => {
    if (!open) {
      setStep(1)
      setForm(BLANK)
      setErrors({})
      setSlugCheck(null)
    }
  }, [open])

  useEffect(() => {
    if (!open || !debouncedName.trim()) {
      setSlugCheck(null)
      return undefined
    }
    let cancelled = false
    setChecking(true)
    checkCourseSlug(debouncedName)
      .then((result) => {
        if (!cancelled) setSlugCheck(result)
      })
      .catch(() => {
        // Only an affordance: create() resolves the final slug server-side anyway.
        if (!cancelled) setSlugCheck(null)
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedName, open])

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      createCourse({
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || undefined,
        thumbnailUrl: form.thumbnailUrl.trim() || undefined,
        visibility: form.visibility,
        password: form.visibility === VISIBILITY.PRIVATE ? form.password : undefined,
        categories: form.categories,
        progressEnabled: form.progressEnabled,
        areaId: form.areaId,
        schoolId: form.schoolId || undefined,
      }),
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.all })
      toast.success('Curso criado! Agora monte o conteudo.')
      onClose()
      navigate(`${courseHref(course)}/edit`)
    },
    onError: (error) => {
      setErrors(fieldErrors(error))
      toast.error(errorMessage(error, 'Nao foi possivel criar o curso.'))
    },
  })

  const effectiveSlug = form.slug.trim() || slugCheck?.suggestion || ''
  const canAdvance = form.name.trim().length > 0
  const canSubmit =
    canAdvance && Boolean(form.areaId) && (form.visibility !== VISIBILITY.PRIVATE || form.password.length >= 4)

  return (
    <>
    <Modal
      open={open}
      onClose={requestClose}
      dismissible={!confirmCloseOpen}
      title="Criar curso"
      description={`Passo ${step} de 2`}
      size="lg"
    >
      {step === 1 ? (
        <div className="space-y-4">
          <Field
            label="Nome do curso"
            htmlFor="course-name"
            error={errors.name}
            required
            value={form.name}
            maxLength={LIMITS.NAME}
          >
            <Input
              id="course-name"
              autoFocus
              maxLength={LIMITS.NAME}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Ex.: Introducao ao Spring Boot"
              invalid={Boolean(errors.name)}
            />
          </Field>

          <Field
            label="URL do curso"
            htmlFor="course-slug"
            error={errors.slug}
            hint="Deixe em branco para usar a sugestao automatica."
          >
            <div className="relative">
              <Input
                id="course-slug"
                maxLength={LIMITS.SLUG}
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
                placeholder={slugCheck?.suggestion || 'sera-gerado-do-nome'}
                className="pr-10 font-mono text-xs"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {checking && <Loader2 size={16} className="animate-spin text-slate-500" />}
                {!checking && slugCheck?.available && <Check size={16} className="text-green-400" />}
                {!checking && slugCheck && !slugCheck.available && (
                  <X size={16} className="text-amber-400" />
                )}
              </span>
            </div>
          </Field>

          {effectiveSlug && (
            <p className="break-all text-xs text-slate-500">
              Ficara em{' '}
              <span className="font-mono text-slate-400">
                /courses/{user.nickname}/{effectiveSlug}
              </span>
              {slugCheck && !slugCheck.available && !form.slug.trim() && (
                <span className="ml-1 text-amber-400">
                  (voce ja tem um curso com esse nome; usaremos a variacao acima)
                </span>
              )}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={requestClose}>
              Cancelar
            </Button>
            <Button onClick={() => setStep(2)} disabled={!canAdvance}>
              Continuar <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field
            label="Descricao curta"
            htmlFor="course-description"
            error={errors.description}
            value={form.description}
            maxLength={LIMITS.DESCRIPTION}
          >
            <Textarea
              id="course-description"
              rows={3}
              maxLength={LIMITS.DESCRIPTION}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Em uma ou duas frases, do que trata o curso?"
            />
          </Field>

          <Field
            label="Thumbnail (URL)"
            htmlFor="course-thumbnail"
            error={errors.thumbnailUrl}
            hint="Proporcao 16:9 fica melhor nos cards."
          >
            <Input
              id="course-thumbnail"
              type="url"
              maxLength={LIMITS.URL}
              value={form.thumbnailUrl}
              onChange={(event) => setForm({ ...form, thumbnailUrl: event.target.value })}
              placeholder="https://..."
            />
          </Field>

          <Field label="Categorias" htmlFor="course-categories">
            <CategoryInput
              value={form.categories}
              onChange={(categories) => setForm({ ...form, categories })}
            />
          </Field>

          <Field
            label="Area"
            htmlFor="course-area"
            required
            hint="A prateleira ampla do curso. Use Categorias para o assunto especifico."
          >
            <AreaSelect
              id="course-area"
              value={form.areaId}
              onChange={(areaId) => setForm({ ...form, areaId })}
            />
          </Field>

          <SchoolSelect
            id="course-school"
            value={form.schoolId}
            onChange={(schoolId) => setForm({ ...form, schoolId })}
          />

          <Field label="Visibilidade" htmlFor="course-visibility">
            <Select
              id="course-visibility"
              value={form.visibility}
              onChange={(event) => setForm({ ...form, visibility: event.target.value })}
            >
              <option value={VISIBILITY.PUBLIC}>Publico — qualquer pessoa pode ver</option>
              <option value={VISIBILITY.PRIVATE}>Privado — exige senha de acesso</option>
            </Select>
          </Field>

          {form.visibility === VISIBILITY.PRIVATE && (
            <Field
              label="Senha de acesso"
              htmlFor="course-password"
              error={errors.password}
              hint="Compartilhe apenas com quem deve ter acesso ao conteudo."
              required
            >
              <Input
                id="course-password"
                type="password"
                maxLength={LIMITS.PASSWORD}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="Minimo 4 caracteres"
              />
            </Field>
          )}

          <Checkbox
            label="Habilitar acompanhamento de progresso"
            description="Alunos podem marcar licoes como concluidas."
            checked={form.progressEnabled}
            onChange={(event) => setForm({ ...form, progressEnabled: event.target.checked })}
          />

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft size={16} /> Voltar
            </Button>
            <div className="flex items-center gap-3">
              {form.visibility === VISIBILITY.PRIVATE && form.password.length < 4 && (
                <p className="text-xs text-red-400">A senha precisa ter no minimo 4 caracteres.</p>
              )}
              <Button onClick={() => submit()} loading={isPending} disabled={!canSubmit}>
                Criar curso
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>

    <ConfirmModal
      open={confirmCloseOpen}
      onClose={() => setConfirmCloseOpen(false)}
      onConfirm={() => {
        setConfirmCloseOpen(false)
        onClose()
      }}
      title="Sair sem criar o curso?"
      message="As informacoes preenchidas serao perdidas."
      confirmLabel="Sair sem salvar"
    />
    </>
  )
}

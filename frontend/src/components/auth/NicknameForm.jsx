import { useEffect, useState } from 'react'
import { AlertCircle, Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useAuth } from '@/context/AuthContext'
import { useDebounce } from '@/hooks/useDebounce'
import { isNicknameAvailable, updateProfile } from '@/api/users'
import { errorMessage, fieldErrors } from '@/lib/api'
import { LIMITS } from '@/lib/constants'
import { slugify } from '@/lib/slug'

const NICKNAME_PATTERN = /^[a-z0-9][a-z0-9-]{2,29}$/

/**
 * The nickname-claiming form itself, with no opinion on where it is displayed. Used both by
 * SetupNicknamePage (full page, right after registering) and NicknameGateModal (interrupting a
 * "create" action for someone who skipped that step).
 */
export function NicknameForm({ onSuccess, submitLabel = 'Continuar' }) {
  const { user, refreshUser } = useAuth()
  const [nickname, setNickname] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [availability, setAvailability] = useState({ state: 'idle', value: '' })

  const debounced = useDebounce(nickname, 300)
  const wellFormed = NICKNAME_PATTERN.test(debounced)

  useEffect(() => {
    if (!debounced || !wellFormed) {
      setAvailability({ state: 'idle', value: debounced })
      return undefined
    }

    let cancelled = false
    setAvailability({ state: 'checking', value: debounced })
    isNicknameAvailable(debounced)
      .then((available) => {
        if (!cancelled) {
          setAvailability({ state: available ? 'free' : 'taken', value: debounced })
        }
      })
      .catch(() => {
        // The check is a convenience; the PATCH below is what really decides.
        if (!cancelled) setAvailability({ state: 'idle', value: debounced })
      })

    return () => {
      cancelled = true
    }
  }, [debounced, wellFormed])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!NICKNAME_PATTERN.test(nickname)) {
      setErrors({ nickname: 'Use de 3 a 30 caracteres: letras minusculas, numeros e hifens.' })
      return
    }

    setSubmitting(true)
    setErrors({})
    setFormError('')
    try {
      const updated = await updateProfile(user.id, { nickname })
      refreshUser(updated)
      onSuccess(updated)
    } catch (error) {
      setErrors(fieldErrors(error))
      setFormError(errorMessage(error, 'Nao foi possivel salvar o nickname.'))
    } finally {
      setSubmitting(false)
    }
  }

  const statusForCurrentInput = availability.value === nickname ? availability.state : 'idle'

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>{formError}</p>
        </div>
      )}

      <Field
        label="Nickname"
        htmlFor="nickname"
        error={errors.nickname}
        hint="Letras minusculas, numeros e hifens. Ex.: ana-dev"
        required
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
            /users/
          </span>
          <Input
            id="nickname"
            name="nickname"
            required
            autoFocus
            autoComplete="off"
            maxLength={LIMITS.NICKNAME}
            className="pl-[4.25rem] pr-10"
            invalid={Boolean(errors.nickname) || statusForCurrentInput === 'taken'}
            value={nickname}
            // The backend only accepts the slug alphabet, so normalise as the user types.
            onChange={(event) => setNickname(slugify(event.target.value).slice(0, LIMITS.NICKNAME))}
            placeholder="seu-nickname"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {statusForCurrentInput === 'checking' && (
              <Loader2 size={16} className="animate-spin text-slate-500" />
            )}
            {statusForCurrentInput === 'free' && <Check size={16} className="text-green-400" />}
            {statusForCurrentInput === 'taken' && <X size={16} className="text-red-400" />}
          </span>
        </div>
      </Field>

      {statusForCurrentInput === 'taken' && (
        <p className="text-xs text-red-400">Esse nickname ja esta em uso.</p>
      )}

      <Button
        type="submit"
        loading={submitting}
        disabled={!NICKNAME_PATTERN.test(nickname) || statusForCurrentInput === 'taken'}
        className="w-full"
      >
        {submitLabel}
      </Button>
    </form>
  )
}

export { NICKNAME_PATTERN }

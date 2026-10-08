import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useAuth } from '@/context/AuthContext'
import { useAuthModal } from '@/context/AuthModalContext'
import { errorMessage } from '@/lib/api'
import { LIMITS } from '@/lib/constants'
import { SwitchLink, useAutoFocus } from './authFormParts'

/**
 * The confirmation never reveals whether the email is registered (see PasswordResetService), so a
 * successful submit always shows the same "check your inbox" message - never an error tied to the
 * email itself. A 429 (too many requests for this inbox) is the one thing worth surfacing, and the
 * API answers it the same way for registered and unknown addresses.
 */
export function ForgotPasswordForm() {
  const { requestPasswordReset } = useAuth()
  const { openLogin } = useAuthModal()
  const firstField = useAutoFocus()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (error) {
      setFormError(errorMessage(error, 'Nao foi possivel enviar o email. Tente novamente.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <CheckCircle2 className="text-green-400" size={40} />
        <p className="font-semibold text-slate-100">Verifique seu email</p>
        <p className="text-sm text-slate-400">
          Se esse email tiver uma conta, enviamos um link para redefinir a senha. Nao recebeu? Confira
          o spam ou tente novamente.
        </p>
        <SwitchLink onClick={openLogin} className="mt-2 text-sm">
          Voltar para o login
        </SwitchLink>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && <p className="text-sm text-red-400">{formError}</p>}

        <Field label="Email" htmlFor="auth-forgot-email" required>
          <Input
            ref={firstField}
            id="auth-forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={LIMITS.EMAIL}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@exemplo.com"
          />
        </Field>

        <Button type="submit" loading={submitting} className="w-full">
          Enviar link de redefinicao
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-400">
        <SwitchLink onClick={openLogin}>Voltar para o login</SwitchLink>
      </p>
    </>
  )
}

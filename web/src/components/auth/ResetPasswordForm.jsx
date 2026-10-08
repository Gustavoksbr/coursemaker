import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useAuth } from '@/context/AuthContext'
import { useAuthModal } from '@/context/AuthModalContext'
import { errorMessage, fieldErrors } from '@/lib/api'
import { LIMITS } from '@/lib/constants'
import { FormError, SwitchLink, useAutoFocus } from './authFormParts'

/** Opened from the link in the reset email (see ResetLinkRedirect); `token` comes from that link. */
export function ResetPasswordForm({ token }) {
  const { confirmPasswordReset } = useAuth()
  const { close, openForgot } = useAuthModal()
  const firstField = useAutoFocus()
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!token) {
    return (
      <div className="space-y-3 text-sm text-slate-300">
        <p>Este link de redefinicao de senha esta incompleto.</p>
        <SwitchLink onClick={openForgot}>Pedir um novo link</SwitchLink>
      </div>
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors({})
    setFormError('')

    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: 'As senhas nao coincidem.' })
      return
    }

    setSubmitting(true)
    try {
      // Resetting signs the user in (the API returns a session), so the dialog just closes.
      await confirmPasswordReset(token, form.password)
      close()
    } catch (error) {
      setErrors(fieldErrors(error))
      setFormError(errorMessage(error, 'Nao foi possivel redefinir a senha. Peca um novo link.'))
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError && (
        <FormError>
          <p>{formError}</p>
        </FormError>
      )}

      <Field label="Nova senha" htmlFor="auth-reset-password" error={errors.newPassword} required>
        <Input
          ref={firstField}
          id="auth-reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={LIMITS.PASSWORD}
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          placeholder="Minimo 8 caracteres"
        />
      </Field>

      <Field label="Confirme a nova senha" htmlFor="auth-reset-confirm" error={errors.confirmPassword} required>
        <Input
          id="auth-reset-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={LIMITS.PASSWORD}
          value={form.confirmPassword}
          onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
          placeholder="Repita a nova senha"
        />
      </Field>

      <Button type="submit" loading={submitting} className="w-full">
        Redefinir senha
      </Button>
    </form>
  )
}

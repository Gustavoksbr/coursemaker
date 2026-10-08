import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GoogleButton, googleLoginEnabled } from '@/components/auth/GoogleButton'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useAuth } from '@/context/AuthContext'
import { useAuthModal } from '@/context/AuthModalContext'
import { errorMessage, fieldErrors } from '@/lib/api'
import { LIMITS } from '@/lib/constants'
import { FormError, OrDivider, SwitchLink, useAutoFocus } from './authFormParts'

const MIN_PASSWORD_LENGTH = 8

export function RegisterForm() {
  const { register, loginWithGoogle } = useAuth()
  const { close, openLogin } = useAuthModal()
  const firstField = useAutoFocus()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (form.password !== form.confirm) {
      setErrors({ confirm: 'As senhas nao conferem' })
      return
    }
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setErrors({ password: `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres` })
      return
    }

    setSubmitting(true)
    setErrors({})
    setFormError('')
    try {
      await register(form.name.trim(), form.email.trim(), form.password)
      // A missing nickname does not block anything but creating content (see useNicknameGate), so
      // a fresh account simply carries on where it was.
      close()
    } catch (error) {
      setErrors(fieldErrors(error))
      setFormError(errorMessage(error, 'Nao foi possivel criar a conta.'))
      setSubmitting(false)
    }
  }

  const handleGoogle = async (idToken) => {
    setFormError('')
    setSubmitting(true)
    try {
      await loginWithGoogle(idToken)
      close()
    } catch (error) {
      setFormError(errorMessage(error, 'Nao foi possivel entrar com o Google.'))
      setSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && (
          <FormError>
            <p>{formError}</p>
          </FormError>
        )}

        <Field label="Nome" htmlFor="auth-name" error={errors.name} required>
          <Input
            ref={firstField}
            id="auth-name"
            name="name"
            autoComplete="name"
            required
            maxLength={LIMITS.NAME}
            invalid={Boolean(errors.name)}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Como voce quer ser chamado"
          />
        </Field>

        <Field label="Email" htmlFor="auth-email" error={errors.email} required>
          <Input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={LIMITS.EMAIL}
            invalid={Boolean(errors.email)}
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="voce@exemplo.com"
          />
        </Field>

        <Field
          label="Senha"
          htmlFor="auth-register-password"
          error={errors.password}
          hint={`Entre ${MIN_PASSWORD_LENGTH} e ${LIMITS.PASSWORD} caracteres`}
          required
        >
          <Input
            id="auth-register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={LIMITS.PASSWORD}
            invalid={Boolean(errors.password)}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="••••••••"
          />
        </Field>

        <Field label="Confirmar senha" htmlFor="auth-confirm" error={errors.confirm} required>
          <Input
            id="auth-confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            maxLength={LIMITS.PASSWORD}
            invalid={Boolean(errors.confirm)}
            value={form.confirm}
            onChange={(event) => setForm({ ...form, confirm: event.target.value })}
            placeholder="••••••••"
          />
        </Field>

        <Button type="submit" loading={submitting} className="w-full">
          Criar conta
        </Button>

        <p className="text-center text-xs text-slate-500">
          Ao criar sua conta, voce concorda com nossa{' '}
          <Link to="/privacidade" onClick={close} className="text-brand-400 hover:text-brand-300">
            Politica de Privacidade
          </Link>
          .
        </p>
      </form>

      {googleLoginEnabled && (
        <>
          <OrDivider />
          <GoogleButton onCredential={handleGoogle} text="signup_with" />
        </>
      )}

      <p className="mt-5 text-center text-sm text-slate-400">
        Ja tem conta? <SwitchLink onClick={openLogin}>Entrar</SwitchLink>
      </p>
    </>
  )
}

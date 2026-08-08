import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { GoogleButton, googleLoginEnabled } from '@/components/auth/GoogleButton'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useAuth } from '@/context/AuthContext'
import { errorMessage, fieldErrors } from '@/lib/api'
import { LIMITS } from '@/lib/constants'

const MIN_PASSWORD_LENGTH = 8

export default function RegisterPage() {
  const { register, loginWithGoogle, isAuthenticated, loading: bootstrapping } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = location.state?.from?.pathname ?? '/'

  if (!bootstrapping && isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

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
      // A missing nickname does not block navigation, only creating content (see
      // useNicknameGate) - so a fresh account goes straight to what it was after, same as login.
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setErrors(fieldErrors(error))
      setFormError(errorMessage(error, 'Nao foi possivel criar a conta.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async (idToken) => {
    setFormError('')
    setSubmitting(true)
    try {
      await loginWithGoogle(idToken)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setFormError(errorMessage(error, 'Nao foi possivel entrar com o Google.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Leva menos de um minuto."
      footer={
        <>
          Ja tem conta?{' '}
          <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{formError}</p>
          </div>
        )}

        <Field label="Nome" htmlFor="name" error={errors.name} required>
          <Input
            id="name"
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

        <Field label="Email" htmlFor="email" error={errors.email} required>
          <Input
            id="email"
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
          htmlFor="password"
          error={errors.password}
          hint={`Entre ${MIN_PASSWORD_LENGTH} e ${LIMITS.PASSWORD} caracteres`}
          required
        >
          <Input
            id="password"
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

        <Field label="Confirmar senha" htmlFor="confirm" error={errors.confirm} required>
          <Input
            id="confirm"
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
      </form>

      {googleLoginEnabled && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-700" />
            ou
            <span className="h-px flex-1 bg-slate-700" />
          </div>
          <GoogleButton onCredential={handleGoogle} text="signup_with" />
        </>
      )}
    </AuthShell>
  )
}

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

export default function LoginPage() {
  const { login, loginWithGoogle, isAuthenticated, loading: bootstrapping } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = location.state?.from?.pathname ?? '/biblioteca'

  if (!bootstrapping && isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  // A missing nickname does not block navigation: it only blocks creating content, and that is
  // handled by the nickname gate wherever a "create" action lives (see useNicknameGate).
  const afterAuth = () => {
    navigate(redirectTo, { replace: true })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})
    setFormError('')
    try {
      afterAuth(await login(form.identifier.trim(), form.password))
    } catch (error) {
      setErrors(fieldErrors(error))
      setFormError(errorMessage(error, 'Nao foi possivel entrar.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async (idToken) => {
    setFormError('')
    setSubmitting(true)
    try {
      afterAuth(await loginWithGoogle(idToken))
    } catch (error) {
      setFormError(errorMessage(error, 'Nao foi possivel entrar com o Google.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse sua conta para criar cursos e acompanhar seu progresso."
      footer={
        <>
          Ainda nao tem conta?{' '}
          <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300">
            Criar conta
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

        <Field label="Email ou usuario" htmlFor="identifier" error={errors.identifier} required>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            required
            maxLength={LIMITS.EMAIL}
            invalid={Boolean(errors.identifier)}
            value={form.identifier}
            onChange={(event) => setForm({ ...form, identifier: event.target.value })}
            placeholder="voce@exemplo.com ou seu-usuario"
          />
        </Field>

        <Field label="Senha" htmlFor="password" error={errors.password} required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={LIMITS.PASSWORD}
            invalid={Boolean(errors.password)}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="••••••••"
          />
        </Field>

        <div className="text-right">
          <Link to="/esqueci-senha" className="text-xs font-medium text-brand-400 hover:text-brand-300">
            Esqueci minha senha
          </Link>
        </div>

        <Button type="submit" loading={submitting} className="w-full">
          Entrar
        </Button>
      </form>

      {googleLoginEnabled && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-700" />
            ou
            <span className="h-px flex-1 bg-slate-700" />
          </div>
          <GoogleButton onCredential={handleGoogle} />
        </>
      )}
    </AuthShell>
  )
}

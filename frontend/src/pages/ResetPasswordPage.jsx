import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useAuth } from '@/context/AuthContext'
import { errorMessage, fieldErrors } from '@/lib/api'
import { LIMITS } from '@/lib/constants'

export default function ResetPasswordPage() {
  const { confirmPasswordReset } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!token) {
    return (
      <AuthShell title="Link invalido" subtitle="Este link de redefinicao de senha esta incompleto.">
        <Link to="/esqueci-senha" className="text-sm font-semibold text-brand-400 hover:text-brand-300">
          Pedir um novo link
        </Link>
      </AuthShell>
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
      await confirmPasswordReset(token, form.password)
      navigate('/biblioteca', { replace: true })
    } catch (error) {
      setErrors(fieldErrors(error))
      setFormError(errorMessage(error, 'Nao foi possivel redefinir a senha. Peca um novo link.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Redefinir senha" subtitle="Escolha uma nova senha para sua conta.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{formError}</p>
          </div>
        )}

        <Field label="Nova senha" htmlFor="password" error={errors.newPassword} required>
          <Input
            id="password"
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

        <Field label="Confirme a nova senha" htmlFor="confirmPassword" error={errors.confirmPassword} required>
          <Input
            id="confirmPassword"
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
    </AuthShell>
  )
}

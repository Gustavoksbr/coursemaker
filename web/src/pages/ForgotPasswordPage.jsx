import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useAuth } from '@/context/AuthContext'
import { errorMessage } from '@/lib/api'
import { LIMITS } from '@/lib/constants'

/**
 * The confirmation never reveals whether the email is registered (see PasswordResetService), so a
 * successful submit always shows the same "check your inbox" message - never an error tied to the
 * email itself.
 */
export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
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
      <AuthShell
        title="Verifique seu email"
        subtitle="Se esse email tiver uma conta, enviamos um link para redefinir a senha."
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="text-green-400" size={40} />
          <p className="text-sm text-slate-400">
            O link expira em algumas horas. Nao recebeu? Confira o spam ou tente novamente.
          </p>
          <Link to="/login" className="mt-2 text-sm font-semibold text-brand-400 hover:text-brand-300">
            Voltar para o login
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Esqueci minha senha"
      subtitle="Informe seu email e enviaremos um link para redefinir sua senha."
      footer={
        <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
          Voltar para o login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && <p className="text-sm text-red-400">{formError}</p>}

        <Field label="Email" htmlFor="email" required>
          <Input
            id="email"
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
    </AuthShell>
  )
}

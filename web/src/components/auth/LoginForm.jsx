import { useEffect, useState } from 'react'
import { GoogleButton, googleLoginEnabled } from '@/components/auth/GoogleButton'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useAuth } from '@/context/AuthContext'
import { useAuthModal } from '@/context/AuthModalContext'
import { errorMessage, fieldErrors } from '@/lib/api'
import { LIMITS } from '@/lib/constants'
import { loginFailureMessage, rateLimitOf } from '@/lib/rateLimit'
import { FormError, OrDivider, SwitchLink, useAutoFocus } from './authFormParts'

export function LoginForm() {
  const { login, loginWithGoogle } = useAuth()
  const { close, openRegister, openForgot } = useAuthModal()
  const firstField = useAutoFocus()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Throttling state from the last failed attempt, plus a ticking clock while a block is running.
  const [limit, setLimit] = useState(null)
  const [blockedUntil, setBlockedUntil] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  const secondsLeft = blockedUntil ? Math.max(0, Math.ceil((blockedUntil - now) / 1000)) : 0
  const blocked = secondsLeft > 0

  useEffect(() => {
    if (!blockedUntil) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [blockedUntil])

  // When the countdown reaches zero the block is over: clear it so the form is usable again.
  useEffect(() => {
    if (blockedUntil && secondsLeft === 0) {
      setBlockedUntil(null)
      setLimit(null)
      setFormError('')
    }
  }, [blockedUntil, secondsLeft])

  // Signing in changes nothing about where the user is: the dialog just closes over the same page.
  // A missing nickname only blocks creating content, and that is handled by useNicknameGate.
  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})
    setFormError('')
    setLimit(null)
    try {
      await login(form.identifier.trim(), form.password)
      close()
    } catch (error) {
      setErrors(fieldErrors(error))
      const info = rateLimitOf(error)
      setLimit(info)
      if (info?.retryAfterSeconds != null) {
        setNow(Date.now())
        setBlockedUntil(Date.now() + info.retryAfterSeconds * 1000)
      }
      setFormError(errorMessage(error, 'Nao foi possivel entrar.'))
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

  const rateLimitText = loginFailureMessage(limit, secondsLeft)

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && (
          <FormError>
            <p>{formError}</p>
            {/* Always tell the user where they stand: tries left, or how long the block lasts. */}
            {rateLimitText && <p className="font-medium text-red-200">{rateLimitText}</p>}
          </FormError>
        )}

        <Field label="Email ou usuario" htmlFor="auth-identifier" error={errors.identifier} required>
          <Input
            ref={firstField}
            id="auth-identifier"
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

        <Field label="Senha" htmlFor="auth-password" error={errors.password} required>
          <Input
            id="auth-password"
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
          <SwitchLink onClick={openForgot} className="text-xs font-medium">
            Esqueci minha senha
          </SwitchLink>
        </div>

        <Button type="submit" loading={submitting} disabled={blocked} className="w-full">
          {blocked ? `Aguarde ${secondsLeft} s` : 'Entrar'}
        </Button>
      </form>

      {googleLoginEnabled && (
        <>
          <OrDivider />
          <GoogleButton onCredential={handleGoogle} />
        </>
      )}

      <p className="mt-5 text-center text-sm text-slate-400">
        Ainda nao tem conta? <SwitchLink onClick={openRegister}>Criar conta</SwitchLink>
      </p>
    </>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Lock } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useAuth } from '@/context/AuthContext'
import { validatePrivateAccess } from '@/api/courses'
import { validatePostPrivateAccess } from '@/api/posts'
import { errorMessage, statusOf } from '@/lib/api'

const VALIDATE_BY_KIND = {
  course: validatePrivateAccess,
  post: validatePostPrivateAccess,
}

const LABEL_BY_KIND = {
  course: 'Curso privado',
  post: 'Post privado',
}

/**
 * Unlocks a private course or post - which one is picked by `kind`.
 *
 * The backend answers 401 with "Senha incorreta. Tentativas restantes: N" for a wrong password and
 * 429 once the attempts run out, so the server's own message is the most accurate thing to show.
 */
export function PrivatePasswordModal({ open, onClose, kind, contentId, contentName, onUnlocked }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [blocked, setBlocked] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const label = LABEL_BY_KIND[kind]
  const validate = VALIDATE_BY_KIND[kind]

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await validate(contentId, password)
      setPassword('')
      onUnlocked()
    } catch (requestError) {
      if (statusOf(requestError) === 429) {
        setBlocked(true)
      }
      setError(errorMessage(requestError, 'Nao foi possivel validar a senha.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <Modal open={open} onClose={onClose} title={label} size="sm">
        <div className="space-y-4 text-sm text-slate-300">
          <p className="flex items-start gap-2">
            <Lock size={16} className="mt-0.5 shrink-0 text-violet-400" />
            <span>
              <strong className="text-slate-100">{contentName}</strong> exige uma senha de acesso.
              Entre na sua conta para informa-la.
            </span>
          </p>
          <Button className="w-full" onClick={() => navigate('/login')}>
            Entrar
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={label}
      description={`Informe a senha para acessar "${contentName}".`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Senha de acesso" htmlFor="private-content-password" error={error} required>
          <div className="relative">
            <KeyRound
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <Input
              id="private-content-password"
              type="password"
              autoFocus
              required
              disabled={blocked}
              invalid={Boolean(error)}
              className="pl-10"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>
        </Field>

        {blocked && (
          <p className="text-xs text-amber-400">
            Muitas tentativas incorretas. Aguarde alguns minutos antes de tentar de novo.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting} disabled={blocked || !password}>
            Desbloquear
          </Button>
        </div>
      </form>
    </Modal>
  )
}

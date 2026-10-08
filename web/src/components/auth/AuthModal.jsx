import { Modal } from '@/components/ui/Modal'
import { useAuthModal } from '@/context/AuthModalContext'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { ResetPasswordForm } from './ResetPasswordForm'

const HEADERS = {
  login: { title: 'Entrar', description: 'Acesse sua conta para criar cursos e acompanhar seu progresso.' },
  register: { title: 'Criar conta', description: 'Leva menos de um minuto.' },
  forgot: {
    title: 'Esqueci minha senha',
    description: 'Informe seu email e enviaremos um link para redefinir sua senha.',
  },
  reset: { title: 'Redefinir senha', description: 'Escolha uma nova senha para sua conta.' },
}

/**
 * The single sign-in dialog: login, register, forgot password and reset password are views of it.
 * The form is only mounted while open, so every opening starts clean. Whatever page is behind it
 * stays exactly as it was.
 */
export function AuthModal() {
  const { view, resetToken, close } = useAuthModal()
  const header = HEADERS[view]

  return (
    <Modal open={Boolean(view)} onClose={close} title={header?.title} description={header?.description} size="sm">
      {view === 'login' && <LoginForm />}
      {view === 'register' && <RegisterForm />}
      {view === 'forgot' && <ForgotPasswordForm />}
      {view === 'reset' && <ResetPasswordForm token={resetToken} />}
    </Modal>
  )
}

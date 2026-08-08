import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '@/components/auth/AuthShell'
import { NicknameForm } from '@/components/auth/NicknameForm'
import { useAuth } from '@/context/AuthContext'

export default function SetupNicknamePage() {
  const { user, needsNickname } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Someone who already has a nickname has no business here.
  if (user && !needsNickname) {
    return <Navigate to={location.state?.from?.pathname ?? '/'} replace />
  }

  return (
    <AuthShell
      title="Escolha seu nickname"
      subtitle="Ele forma a URL do seu perfil e dos seus cursos, e nao pode ser alterado depois."
    >
      <NicknameForm onSuccess={() => navigate(location.state?.from?.pathname ?? '/', { replace: true })} />
    </AuthShell>
  )
}

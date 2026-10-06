import { useEffect } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMessaging } from '@/context/MessagingContext'

/**
 * Compatibilidade com links antigos (/mensagens, /mensagens/:nickname): abre a modal e volta para a pagina
 * de onde a pessoa veio (ou para o inicio, se o link foi aberto direto).
 */
export function MessagesRoute() {
  const { nickname } = useParams()
  const { openMessages } = useMessaging()
  const location = useLocation()
  const navigate = useNavigate()
  const cameFromInsideTheApp = location.key !== 'default'

  useEffect(() => {
    openMessages(nickname ?? null)
    if (cameFromInsideTheApp) navigate(-1)
  }, [nickname, openMessages, cameFromInsideTheApp, navigate])

  return cameFromInsideTheApp ? null : <Navigate to="/" replace />
}

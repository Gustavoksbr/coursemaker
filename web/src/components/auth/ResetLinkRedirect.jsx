import { useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuthModal } from '@/context/AuthModalContext'

/**
 * Landing spot for the link in the password-reset email (/redefinir-senha?token=...). There is no
 * reset page: this opens the reset dialog and sends the visitor to the homepage behind it.
 */
export function ResetLinkRedirect() {
  const [searchParams] = useSearchParams()
  const { openReset } = useAuthModal()
  const token = searchParams.get('token') ?? ''

  useEffect(() => {
    openReset(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return <Navigate to="/" replace />
}

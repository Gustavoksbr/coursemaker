import { useCallback, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'

/**
 * Gates a "create" action (new course, new post) behind having a nickname.
 *
 * Anonymous visitors are let through untouched - the caller is responsible for whatever it does
 * for logged-out users (show a login link, hide the button, etc). An authenticated user missing a
 * nickname gets the claim-a-nickname modal first; the original action only runs after they
 * succeed, and never runs at all if they cancel.
 */
export function useNicknameGate() {
  const { isAuthenticated, needsNickname } = useAuth()
  const [open, setOpen] = useState(false)
  const pendingAction = useRef(null)

  const requireNickname = useCallback(
    (action) => {
      if (isAuthenticated && needsNickname) {
        pendingAction.current = action
        setOpen(true)
        return
      }
      action()
    },
    [isAuthenticated, needsNickname],
  )

  const close = useCallback(() => {
    pendingAction.current = null
    setOpen(false)
  }, [])

  const handleSuccess = useCallback(() => {
    setOpen(false)
    const action = pendingAction.current
    pendingAction.current = null
    action?.()
  }, [])

  return {
    requireNickname,
    nicknameModalProps: { open, onClose: close, onSuccess: handleSuccess },
  }
}

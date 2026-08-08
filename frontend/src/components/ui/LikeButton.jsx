import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * Heart toggle with an optimistic count. The parent owns the initial values and gets told about the
 * server's answer through `onChange`, so lists and detail pages stay in sync.
 */
export function LikeButton({ liked, count, onLike, onUnlike, onChange, size = 'md', className }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [pending, setPending] = useState(false)
  const [state, setState] = useState({ liked, count })

  // The parent may hand us fresher data (a refetch); adopt it while we are not mid-flight.
  if (!pending && (state.liked !== liked || state.count !== count)) {
    setState({ liked, count })
  }

  const toggle = async (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    const previous = state
    const optimistic = { liked: !previous.liked, count: previous.count + (previous.liked ? -1 : 1) }
    setState(optimistic)
    setPending(true)
    try {
      const result = previous.liked ? await onUnlike() : await onLike()
      const settled = { liked: result.liked, count: result.likeCount }
      setState(settled)
      onChange?.(settled)
    } catch (error) {
      setState(previous)
      toast.error(errorMessage(error, 'Nao foi possivel registrar sua curtida.'))
    } finally {
      setPending(false)
    }
  }

  const iconSize = size === 'sm' ? 14 : 16

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={state.liked}
      aria-label={state.liked ? 'Descurtir' : 'Curtir'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-colors',
        state.liked ? 'text-red-400' : 'text-slate-400 hover:text-red-400',
        size === 'sm' && 'text-xs',
        className,
      )}
    >
      <Heart size={iconSize} className={cn(state.liked && 'fill-current')} />
      <span className="tabular-nums">{state.count}</span>
    </button>
  )
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ban, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { toggleCourseBlock } from '@/api/courses'
import { togglePostBlock } from '@/api/posts'
import { toggleTrilhaBlock } from '@/api/trilhas'
import { courseKeys } from '@/api/courses'
import { postKeys } from '@/api/posts'
import { trilhaKeys } from '@/api/trilhas'

const TOGGLERS = {
  course: toggleCourseBlock,
  post: togglePostBlock,
  trilha: toggleTrilhaBlock,
}

const QUERY_KEYS = {
  course: courseKeys,
  post: postKeys,
  trilha: trilhaKeys,
}

/**
 * Admin-only button to block/unblock courses, posts, or trilhas.
 * Only visible to admins and the content owner.
 */
export function BlockToggleButton({ kind, item, size = 'sm', onSuccess }) {
  const { isAdmin } = useAuth()
  const { showSuccess, showError } = useToast()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => TOGGLERS[kind](item.id),
    onSuccess: (updated) => {
      const action = updated.blockedByAdmin ? 'bloqueado' : 'desbloqueado'
      showSuccess(`${kind === 'course' ? 'Curso' : kind === 'post' ? 'Post' : 'Trilha'} ${action}`)

      // Invalidate all related queries
      const keys = QUERY_KEYS[kind]
      queryClient.invalidateQueries({ queryKey: keys.all })
      queryClient.invalidateQueries({ queryKey: keys.byId(item.id) })
      if (item.owner?.nickname && item.slug) {
        queryClient.invalidateQueries({ queryKey: keys.bySlug(item.owner.nickname, item.slug) })
      }

      onSuccess?.(updated)
    },
    onError: (error) => {
      showError(error.message || 'Erro ao alterar bloqueio')
    },
  })

  // Only show to admins
  if (!isAdmin) {
    return null
  }

  const isBlocked = item.blockedByAdmin
  const label = isBlocked ? 'Desbloquear' : 'Bloquear'
  const Icon = isBlocked ? Check : Ban

  return (
    <Button
      variant={isBlocked ? 'success' : 'danger'}
      size={size}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      title={`${label} (admin)`}
    >
      <Icon size={16} />
      {label}
    </Button>
  )
}

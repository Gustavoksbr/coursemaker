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

const LABELS = { course: 'Curso', post: 'Post', trilha: 'Trilha' }

/** Patches `blockedByAdmin` into whichever cached shape holds this id: a flat summary, or a `{ summary }` detail wrapper. */
function patchBlocked(current, id, blockedByAdmin) {
  if (!current) return current
  if (current.summary?.id === id) {
    return { ...current, summary: { ...current.summary, blockedByAdmin } }
  }
  if (current.id === id) {
    return { ...current, blockedByAdmin }
  }
  return current
}

/**
 * Admin-only button to block/unblock courses, posts, or trilhas.
 * Only visible to admins and the content owner.
 *
 * Updates optimistically: blocking is a reversible, low-risk toggle, so the label flips right away
 * instead of waiting on the round trip (which previously only reflected on the next page reload,
 * since nothing here was reading from the query cache the invalidation targeted). A failed request
 * rolls the cache back and shows an error toast.
 */
export function BlockToggleButton({ kind, item, size = 'sm', onSuccess }) {
  const { isAdmin } = useAuth()
  const { showSuccess, showError } = useToast()
  const queryClient = useQueryClient()
  const keys = QUERY_KEYS[kind]

  const byIdKey = keys.byId(item.id)
  const bySlugKey = item.owner?.nickname && item.slug ? keys.bySlug(item.owner.nickname, item.slug) : null

  const mutation = useMutation({
    mutationFn: () => TOGGLERS[kind](item.id),
    onMutate: async () => {
      const nextBlocked = !item.blockedByAdmin

      await queryClient.cancelQueries({ queryKey: byIdKey })
      if (bySlugKey) await queryClient.cancelQueries({ queryKey: bySlugKey })

      const previousById = queryClient.getQueryData(byIdKey)
      const previousBySlug = bySlugKey ? queryClient.getQueryData(bySlugKey) : undefined

      queryClient.setQueryData(byIdKey, (current) => patchBlocked(current, item.id, nextBlocked))
      if (bySlugKey) {
        queryClient.setQueryData(bySlugKey, (current) => patchBlocked(current, item.id, nextBlocked))
      }

      return { previousById, previousBySlug }
    },
    onSuccess: (updated) => {
      const action = updated.blockedByAdmin ? 'bloqueado' : 'desbloqueado'
      showSuccess(`${LABELS[kind]} ${action}`)
      // Catches up listing/catalog queries in the background; the detail caches are already correct.
      queryClient.invalidateQueries({ queryKey: keys.all })
      onSuccess?.(updated)
    },
    onError: (error, _vars, context) => {
      if (context) {
        queryClient.setQueryData(byIdKey, context.previousById)
        if (bySlugKey) queryClient.setQueryData(bySlugKey, context.previousBySlug)
      }
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
      loading={mutation.isPending}
      disabled={mutation.isPending}
      title={`${label} (admin)`}
    >
      <Icon size={16} />
      {label}
    </Button>
  )
}

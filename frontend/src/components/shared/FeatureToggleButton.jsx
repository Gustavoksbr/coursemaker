import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { toggleCourseFeatured } from '@/api/courses'
import { togglePostFeatured } from '@/api/posts'
import { toggleTrilhaFeatured } from '@/api/trilhas'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

const TOGGLERS = {
  course: toggleCourseFeatured,
  post: togglePostFeatured,
  trilha: toggleTrilhaFeatured,
}

/**
 * Admin-only "destacar" switch. Featured content is what the landing page shows first (see
 * SearchService, which prefers it for the empty-term view), so this is the whole curation story
 * for the home - no separate CMS needed for picking cards.
 *
 * Renders nothing for non-admins; the API enforces the same rule server-side.
 */
export function FeatureToggleButton({ kind, contentId, featured, onChanged }) {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()

  const { mutate: toggle, isPending } = useMutation({
    mutationFn: () => TOGGLERS[kind](contentId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['home'] })
      queryClient.invalidateQueries({ queryKey: ['search'] })
      onChanged?.()
      toast.success(updated.featured ? 'Conteudo destacado na home.' : 'Destaque removido.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel alterar o destaque.')),
  })

  if (!isAdmin) return null

  return (
    <button
      type="button"
      onClick={() => toggle()}
      disabled={isPending}
      title={featured ? 'Remover destaque da home' : 'Destacar na home'}
      className={cn('btn-secondary text-sm disabled:opacity-50', featured && 'text-amber-300')}
    >
      <Star size={15} className={cn(featured && 'fill-current')} />
      {featured ? 'Destacado' : 'Destacar'}
    </button>
  )
}

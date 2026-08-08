import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ShieldOff, Users } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { useToast } from '@/context/ToastContext'
import { courseKeys, listStudents, revokeAccess } from '@/api/courses'
import { errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { VISIBILITY } from '@/lib/constants'

/** Owner-only list of enrolled students, with revoke for private-course access. */
export function StudentsModal({ open, onClose, course }) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: students, isPending } = useQuery({
    queryKey: courseKeys.students(course.id),
    queryFn: () => listStudents(course.id),
    enabled: open,
  })

  const { mutate: revoke } = useMutation({
    mutationFn: (userId) => revokeAccess(course.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: courseKeys.students(course.id) })
      toast.success('Acesso revogado. A pessoa precisara digitar a senha de novo.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel revogar o acesso.')),
  })

  const isPrivate = course.visibility === VISIBILITY.PRIVATE

  return (
    <Modal open={open} onClose={onClose} title="Alunos matriculados" size="lg">
      {isPending ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Ninguem matriculado ainda"
          message="Assim que alguem se matricular, aparece aqui."
        />
      ) : (
        <ul className="max-h-[60vh] divide-y divide-slate-700 overflow-y-auto">
          {students.map(({ user, enrolledAt, hasPrivateAccess }) => (
            <li key={user.id} className="flex items-center gap-3 py-3">
              <Avatar src={user.image} name={user.name} />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/users/${user.nickname}`}
                  className="block truncate text-sm font-medium text-slate-100 hover:text-brand-400"
                >
                  {user.name}
                </Link>
                <p className="truncate text-xs text-slate-500">
                  @{user.nickname} · matriculado em {formatDate(enrolledAt)}
                </p>
              </div>

              {isPrivate && (
                <>
                  {hasPrivateAccess ? (
                    <>
                      <Badge tone="brand">Acesso liberado</Badge>
                      <button
                        type="button"
                        onClick={() => revoke(user.id)}
                        className="btn-ghost px-2 py-1 text-xs hover:text-amber-400"
                        title="Revogar acesso ao conteudo"
                      >
                        <ShieldOff size={14} /> Revogar
                      </button>
                    </>
                  ) : (
                    <Badge>Sem acesso</Badge>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

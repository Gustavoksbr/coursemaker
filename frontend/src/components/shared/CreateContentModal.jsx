import { BookOpen, GraduationCap, Waypoints } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

const OPTIONS = [
  { key: 'course', label: 'Curso', description: 'Aulas organizadas em modulos', icon: GraduationCap },
  { key: 'post', label: 'Post', description: 'Artigo ou tutorial avulso', icon: BookOpen },
  { key: 'trilha', label: 'Trilha', description: 'Sequencia de cursos e posts', icon: Waypoints },
]

/** First step of the global "Criar" button: pick what to create, then the caller takes over. */
export function CreateContentModal({ open, onClose, onChoose }) {
  return (
    <Modal open={open} onClose={onClose} title="O que voce quer criar?" size="md">
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map(({ key, label, description, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChoose(key)}
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 p-5 text-center transition-colors hover:border-brand-500 hover:bg-slate-800"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-500/15 text-brand-400">
              <Icon size={22} />
            </span>
            <span className="font-semibold text-slate-100">{label}</span>
            <span className="text-xs text-slate-500">{description}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

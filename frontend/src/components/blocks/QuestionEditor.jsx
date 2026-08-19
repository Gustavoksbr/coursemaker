import { Plus, Trash2 } from 'lucide-react'
import { Textarea } from '@/components/ui/Field'
import { LIMITS } from '@/lib/constants'
import { makeAlternative, parseQuestionContent, stringifyQuestionContent } from '@/lib/questionBlock'

/**
 * Authoring form for a QUESTION block: an ordered list of alternatives, each with its own text, a
 * "correta" radio (exactly one alternative is ever marked correct - picking a new one unmarks the
 * old), and an explanation shown once a student reveals it. Always live, like every other block
 * type - see BlockEditor's own comment for why there is no separate save step here.
 */
export function QuestionEditor({ blockId, content, onChange }) {
  const { alternatives } = parseQuestionContent(content)
  const hasCorrect = alternatives.some((alternative) => alternative.correct)

  const commit = (next) => onChange(stringifyQuestionContent({ alternatives: next }))

  const updateAlternative = (id, patch) => {
    commit(alternatives.map((alternative) => (alternative.id === id ? { ...alternative, ...patch } : alternative)))
  }

  const markCorrect = (id) => {
    commit(alternatives.map((alternative) => ({ ...alternative, correct: alternative.id === id })))
  }

  const addAlternative = () => commit([...alternatives, makeAlternative(false)])

  const removeAlternative = (id) => commit(alternatives.filter((alternative) => alternative.id !== id))

  return (
    <div className="space-y-3">
      {!hasCorrect && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          Marque uma alternativa como correta.
        </p>
      )}

      <div className="space-y-3">
        {alternatives.map((alternative, index) => (
          <div key={alternative.id} className="space-y-2 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
            <div className="flex items-center gap-2">
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-slate-400">
                <input
                  type="radio"
                  name={`question-${blockId}-correct`}
                  checked={alternative.correct}
                  onChange={() => markCorrect(alternative.id)}
                  className="h-4 w-4 accent-green-500"
                />
                Correta
              </label>
              <input
                type="text"
                maxLength={LIMITS.TITLE}
                value={alternative.text}
                onChange={(event) => updateAlternative(alternative.id, { text: event.target.value })}
                placeholder={`Alternativa ${index + 1}`}
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => removeAlternative(alternative.id)}
                disabled={alternatives.length <= 2}
                className="shrink-0 rounded p-1.5 text-slate-500 hover:bg-slate-700 hover:text-red-400 disabled:pointer-events-none disabled:opacity-30"
                aria-label="Remover alternativa"
                title={alternatives.length <= 2 ? 'A questao precisa de pelo menos duas alternativas' : undefined}
              >
                <Trash2 size={15} />
              </button>
            </div>
            <Textarea
              rows={2}
              maxLength={LIMITS.DESCRIPTION}
              value={alternative.explanation}
              onChange={(event) => updateAlternative(alternative.id, { explanation: event.target.value })}
              placeholder="Explicacao mostrada quando o aluno revelar esta alternativa..."
              aria-label={`Explicacao da alternativa ${index + 1}`}
              className="text-sm"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addAlternative}
        className="btn-ghost border border-dashed border-slate-700 text-xs hover:border-brand-500"
      >
        <Plus size={14} /> Adicionar alternativa
      </button>
    </div>
  )
}

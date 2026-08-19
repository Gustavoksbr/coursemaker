import { useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import { parseQuestionContent } from '@/lib/questionBlock'
import { cn } from '@/lib/cn'

const LETTERS = 'ABCDEFGHIJ'

/**
 * A multiple-choice question. Nothing reveals which alternative is correct until the student
 * clicks one: a wrong click reveals only that alternative (red, with its own explanation) so they
 * can keep guessing; the correct click reveals everything at once (its green explanation, plus
 * every other alternative's red explanation), since the answer is settled at that point.
 */
export function QuestionBlock({ content }) {
  const { alternatives } = parseQuestionContent(content)
  const [revealedIds, setRevealedIds] = useState(() => new Set())

  const reveal = (alternative) => {
    if (alternative.correct) {
      setRevealedIds(new Set(alternatives.map((item) => item.id)))
    } else {
      setRevealedIds((current) => new Set(current).add(alternative.id))
    }
  }

  const clear = () => setRevealedIds(new Set())

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-400">Selecione uma alternativa:</p>
        {revealedIds.size > 0 && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            <RotateCcw size={13} /> Limpar
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {alternatives.map((alternative, index) => {
          const revealed = revealedIds.has(alternative.id)
          return (
            <li key={alternative.id}>
              <button
                type="button"
                onClick={() => reveal(alternative)}
                disabled={revealed}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border-l-4 p-3 text-left transition-colors disabled:cursor-default',
                  !revealed && 'border-brand-500/60 bg-slate-800/60 hover:bg-slate-800',
                  revealed && alternative.correct && 'border-green-500 bg-green-950/30',
                  revealed && !alternative.correct && 'border-red-500 bg-red-950/30',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                    !revealed && 'bg-slate-700 text-slate-300',
                    revealed && alternative.correct && 'bg-green-500 text-white',
                    revealed && !alternative.correct && 'bg-red-500 text-white',
                  )}
                >
                  {revealed ? alternative.correct ? <Check size={14} /> : <X size={14} /> : (LETTERS[index] ?? index + 1)}
                </span>
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="block text-sm text-slate-100">{alternative.text}</span>
                  {revealed && alternative.explanation && (
                    <span className="mt-1.5 block text-sm text-slate-400">{alternative.explanation}</span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

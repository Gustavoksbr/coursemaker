import { Bot, Check } from 'lucide-react'
import { Textarea } from '@/components/ui/Field'
import { LIMITS } from '@/lib/constants'

/**
 * Optional transcript - or summary, or explanation - of a video block. Students never see it: it only feeds the AI assistant, which cannot
 * watch videos, so it can answer questions about what is said in them. Lives inside the block draft like every
 * other field - it reaches the server with the page's own "Salvar alteracoes".
 */
export function TranscriptField({ blockId, value, onChange }) {
  const length = value.length
  const filled = value.trim().length > 0
  const id = `block-transcript-${blockId}`

  return (
    <details className="group rounded-lg border border-slate-700 bg-slate-900/40">
      <summary className="flex cursor-pointer select-none flex-wrap items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-slate-100">
        <Bot size={14} className="shrink-0 text-brand-400" aria-hidden="true" />
        <span>Transcricao ou resumo do video</span>
        <span className="text-xs text-slate-500">(opcional, so para o assistente de IA)</span>
        {filled && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
            <Check size={12} aria-hidden="true" /> adicionada ({length.toLocaleString('pt-BR')} caracteres)
          </span>
        )}
      </summary>

      <div className="space-y-3 border-t border-slate-700 px-3 py-3">
        <p className="text-xs leading-relaxed text-slate-400">
          Cole aqui a transcricao do video ou, se preferir, uma explicacao ou um resumo dele: nao precisa ser a fala
          exata. <strong className="text-slate-300">Os alunos nao veem este texto</strong>: ele so serve para o
          assistente de IA responder perguntas sobre o que o video diz, ja que ele nao consegue assistir ao video.
        </p>

        <Textarea
          id={id}
          rows={8}
          maxLength={LIMITS.TRANSCRIPT}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Cole a transcricao, o resumo ou a explicacao do video aqui..."
          aria-label="Transcricao ou resumo do video"
          className="font-mono text-[12px]"
          spellCheck={false}
        />
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {length.toLocaleString('pt-BR')} / {LIMITS.TRANSCRIPT.toLocaleString('pt-BR')} caracteres
          </span>
          {filled && (
            <button type="button" onClick={() => onChange('')} className="text-slate-400 underline hover:text-red-400">
              Remover texto
            </button>
          )}
        </div>
      </div>
    </details>
  )
}

import { useState } from 'react'
import { CornerDownLeft, X } from 'lucide-react'
import { LIMITS } from '@/lib/constants'

const MAX_CATEGORIES = 20

/**
 * Tag input: Enter or comma commits the current text, Backspace on an empty field pops the last.
 * The "press Enter" mechanic is not obvious from a bare text field, so a keycap icon sits inside
 * the box while there is room, and a caption underneath spells it out either way.
 */
export function CategoryInput({
  value = [],
  onChange,
  placeholder = 'Digite e pressione Enter',
  maxItemLength = LIMITS.CATEGORY,
}) {
  const [draft, setDraft] = useState('')

  const commit = (raw) => {
    const category = raw.trim().slice(0, maxItemLength)
    if (!category || value.includes(category) || value.length >= MAX_CATEGORIES) {
      setDraft('')
      return
    }
    onChange([...value, category])
    setDraft('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit(draft)
      return
    }
    if (event.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const atLimit = value.length >= MAX_CATEGORIES

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 p-2 focus-within:border-brand-500">
        {value.map((category) => (
          <span key={category} className="badge max-w-full break-all bg-brand-500/15 text-brand-300">
            {category}
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item !== category))}
              aria-label={`Remover ${category}`}
              className="shrink-0 text-brand-400/70 hover:text-brand-200"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <div className="flex min-w-[10rem] flex-1 items-center gap-1.5">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => commit(draft)}
            placeholder={atLimit ? 'Limite atingido' : placeholder}
            disabled={atLimit}
            maxLength={maxItemLength}
            aria-label="Nova categoria. Pressione Enter para adicionar"
            className="min-w-0 flex-1 bg-transparent px-1 py-0.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          {/* A visual cue that Enter does something here - easy to miss on a field that otherwise
              looks like plain text input. */}
          {draft.trim() && !atLimit && (
            <CornerDownLeft size={13} className="shrink-0 text-slate-600" aria-hidden="true" />
          )}
        </div>
      </div>
      {!atLimit && (
        <p className="mt-1 text-xs text-slate-500">Pressione Enter ou vírgula para adicionar.</p>
      )}
    </div>
  )
}

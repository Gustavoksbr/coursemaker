import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { highlight } from '@/lib/highlighter'

/**
 * Syntax-highlighted code. Shiki and the grammar load on demand (see `lib/highlighter`), and the
 * plain <pre> below is what renders until they land — or if highlighting fails outright.
 */
export function CodeBlock({ code = '', language = 'plaintext' }) {
  const [html, setHtml] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setHtml(null)

    highlight(code, language)
      .then((result) => {
        if (!cancelled) setHtml(result)
      })
      .catch(() => {
        // Highlighting is cosmetic; the fallback <pre> already shows the code.
      })

    return () => {
      cancelled = true
    }
  }, [code, language])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked; nothing useful to tell the user */
    }
  }

  return (
    <div className="group relative">
      <div className="absolute right-2 top-2 z-10 flex items-center gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        {language && language !== 'plaintext' && (
          <span className="rounded bg-slate-800/90 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-slate-400">
            {language}
          </span>
        )}
        <button
          type="button"
          onClick={copy}
          className="rounded bg-slate-800/90 p-1.5 text-slate-400 hover:text-slate-100"
          aria-label="Copiar codigo"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      </div>

      {html ? (
        // Shiki's output is generated from the code text, not from user-supplied HTML.
        <div className="shiki-container" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-[13px] leading-relaxed text-slate-200">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}

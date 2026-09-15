import { useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { Bot, GripHorizontal, Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { chatAboutCourse, chatAboutPost } from '@/api/ai'
import { useAuth } from '@/context/AuthContext'
import { useDraggableWidget } from '@/hooks/useDraggableWidget'
import { errorMessage, statusOf } from '@/lib/api'
import { cn } from '@/lib/cn'
import { renderMarkdown } from '@/lib/markdown'

const BUBBLE_SIZE = 56
const PANEL_GAP = 16
const DEFAULT_BOTTOM = 24
// Clears the fixed "Proxima aula" bar in CourseViewPage's lesson view, which the bubble would
// otherwise sit on top of the very first time it renders - dragging it away is still possible
// afterwards, but a new visitor shouldn't have to know that just to reach the button underneath.
const RAISED_DEFAULT_BOTTOM = 104

const SUGGESTIONS = {
  course: ['Resuma este curso', 'Quais sao os principais topicos?', 'Por onde eu comeco?'],
  post: ['Resuma este post', 'Quais sao os pontos principais?', 'Explique isso de forma simples'],
}

const COPY = {
  course: {
    title: 'Assistente do curso',
    subtitle: 'Pergunte sobre o conteudo das aulas',
    empty: 'Faca uma pergunta ou escolha uma sugestao para que eu analise este curso.',
    placeholder: 'Pergunte algo sobre o curso...',
  },
  post: {
    title: 'Assistente do post',
    subtitle: 'Pergunte sobre o conteudo deste post',
    empty: 'Faca uma pergunta ou escolha uma sugestao para que eu analise este post.',
    placeholder: 'Pergunte algo sobre o post...',
  },
}

/**
 * Floating chat bubble that answers questions grounded in a course's or post's own content.
 * Fully draggable (mouse or touch) so it can never get stuck on top of other controls - see
 * useDraggableWidget. `raised` only affects where it starts out before the user ever drags it.
 */
export function ChatWidget({ kind, contentId, raised = false }) {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)
  const bubbleRef = useRef(null)
  const panelRef = useRef(null)
  const defaultBottom = raised ? RAISED_DEFAULT_BOTTOM : DEFAULT_BOTTOM
  const { position, makeHandle } = useDraggableWidget('coursemaker:chat-widget-position', {
    bottom: defaultBottom,
    right: 24,
  })

  const copy = COPY[kind]
  const sendFn = kind === 'course' ? chatAboutCourse : chatAboutPost

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  if (!isAuthenticated || !contentId) return null

  const send = async (text) => {
    const message = text.trim()
    if (!message || sending) return

    const history = messages.map(({ role, content }) => ({ role, content }))
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setInput('')
    setError('')
    setSending(true)

    try {
      const { reply } = await sendFn(contentId, { message, history })
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      const status = statusOf(err)
      const fallback =
        status === 429
          ? 'Voce enviou muitas perguntas em pouco tempo. Aguarde um instante.'
          : 'Nao foi possivel falar com o assistente agora. Tente novamente.'
      setError(errorMessage(err, fallback))
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        ref={bubbleRef}
        type="button"
        {...makeHandle(bubbleRef, () => setOpen((value) => !value))}
        style={{ bottom: position.bottom, right: position.right }}
        className="fixed z-40 flex h-14 w-14 cursor-grab touch-none items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-900/40 transition-transform hover:scale-105 hover:bg-brand-600 active:cursor-grabbing"
        aria-label={open ? 'Fechar assistente' : 'Abrir assistente'}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{ bottom: position.bottom + BUBBLE_SIZE + PANEL_GAP, right: position.right }}
          className="fixed z-40 flex h-[32rem] max-h-[70vh] w-96 max-w-[calc(100vw-2rem)] animate-slide-up flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        >
          <header
            {...makeHandle(panelRef, undefined)}
            className="flex cursor-grab touch-none items-center gap-3 border-b border-slate-700 bg-slate-800/80 px-4 py-3 active:cursor-grabbing"
          >
            <GripHorizontal size={16} className="shrink-0 text-slate-600" aria-hidden="true" />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
              <Bot size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-100">{copy.title}</p>
              <p className="truncate text-xs text-slate-400">{copy.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-100"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS[kind].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => send(suggestion)}
                      className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-300 hover:bg-brand-500/20"
                    >
                      <Sparkles size={12} className="mr-1 inline-block" />
                      {suggestion}
                    </button>
                  ))}
                </div>
                <p className="rounded-xl border border-dashed border-slate-700 px-3 py-4 text-sm text-slate-400">
                  {copy.empty}
                </p>
              </>
            ) : (
              messages.map((entry, index) => <Bubble key={index} role={entry.role} content={entry.content} />)
            )}

            {sending && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 size={14} className="animate-spin" /> Pensando...
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 border-t border-slate-700 bg-slate-800/60 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={copy.placeholder}
              disabled={sending}
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Enviar"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function Bubble({ role, content }) {
  const isUser = role === 'user'

  // Only the assistant's replies go through Markdown - the model is the one prompted to format
  // (see AiChatService.systemPrompt); the user's own typed message is shown verbatim.
  const html = useMemo(
    () => (isUser ? null : DOMPurify.sanitize(renderMarkdown(content), { USE_PROFILES: { html: true } })),
    [isUser, content],
  )

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] break-words rounded-2xl px-3.5 py-2',
          isUser
            ? 'rounded-br-sm bg-brand-500 text-sm text-white'
            : 'rounded-bl-sm border border-slate-700 bg-slate-800',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="chat-markdown" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  )
}

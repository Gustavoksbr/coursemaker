import { useEffect, useRef } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { ConversationList } from './ConversationList'
import { MessageThread } from './MessageThread'
import { useAuth } from '@/context/AuthContext'
import { useMessaging } from '@/context/MessagingContext'

/**
 * A caixa de mensagens como um painel flutuante preso ao canto da barra de navegacao (o mesmo jeito
 * das notificacoes), e NAO como uma modal: sem fundo escurecido, sem travar a rolagem e sem fechar ao
 * clicar fora. Assim da para conversar sobre o que se esta vendo (uma aula, um post) olhando para a
 * pagina ao mesmo tempo. Fecha no "x", no Escape ou clicando de novo no icone de mensagens.
 *
 * Mostra a lista de conversas e, ao escolher uma, a conversa (com um botao para voltar a lista).
 * Fica montada uma vez so, no layout; quem quiser abri-la usa `openMessages(nickname?)`.
 */
export function MessagesModal() {
  const { isAuthenticated } = useAuth()
  const { modal, showConversation, closeMessages } = useMessaging()
  const panelRef = useRef(null)

  // Sair da conta com o painel aberto nao deve deixar a conversa de outra pessoa na tela.
  useEffect(() => {
    if (!isAuthenticated && modal.open) closeMessages()
  }, [isAuthenticated, modal.open, closeMessages])

  useEffect(() => {
    if (!modal.open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeMessages()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [modal.open, closeMessages])

  // Leva o foco ao painel so quando ele abre (nao a cada troca de conversa), para quem usa teclado.
  useEffect(() => {
    if (modal.open) panelRef.current?.focus()
  }, [modal.open])

  if (!isAuthenticated || !modal.open) return null

  return (
    // A faixa cobre a largura da barra de navegacao mas deixa os cliques passarem; so o painel os recebe.
    <div className="pointer-events-none fixed inset-x-0 top-16 z-40">
      <div className="mx-auto flex max-w-7xl justify-end px-2 pt-2 sm:px-6">
        <section
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Mensagens"
          tabIndex={-1}
          className="pointer-events-auto flex max-h-[calc(100dvh-5rem)] w-full animate-slide-up flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl outline-none sm:w-[26rem] sm:max-h-[min(40rem,calc(100dvh-5rem))]"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700 px-4 py-3">
            {modal.nickname ? (
              <button
                type="button"
                onClick={() => showConversation(null)}
                className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-sm font-semibold text-slate-100 hover:text-brand-400"
              >
                <ChevronLeft size={16} /> Mensagens
              </button>
            ) : (
              <h2 className="text-sm font-semibold text-slate-100">Mensagens</h2>
            )}
            <button
              type="button"
              onClick={closeMessages}
              className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
              aria-label="Fechar mensagens"
            >
              <X size={16} />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {modal.nickname ? (
              <MessageThread key={modal.nickname} nickname={modal.nickname} onNavigate={closeMessages} />
            ) : (
              <ConversationList onSelect={showConversation} />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

/** Botao que abre a caixa de mensagens (opcionalmente ja numa conversa). Mantem o visual de quem o usa. */
export function OpenMessagesButton({ nickname = null, className, children }) {
  const { openMessages } = useMessaging()
  return (
    <button type="button" onClick={() => openMessages(nickname)} className={className}>
      {children}
    </button>
  )
}

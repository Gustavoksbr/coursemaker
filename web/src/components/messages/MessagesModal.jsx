import { useEffect } from 'react'
import { ChevronLeft, Mail } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { ConversationList } from './ConversationList'
import { MessageThread } from './MessageThread'
import { useAuth } from '@/context/AuthContext'
import { useMessaging } from '@/context/MessagingContext'

/**
 * A caixa de mensagens como modal (no lugar das antigas paginas /mensagens): a lista de conversas, e
 * ao escolher uma, a conversa, com um botao para voltar a lista. O "x" do topo fecha tudo.
 * Fica montada uma vez so, no layout; quem quiser abri-la usa `openMessages(nickname?)`.
 */
export function MessagesModal() {
  const { isAuthenticated } = useAuth()
  const { modal, showConversation, closeMessages } = useMessaging()

  // Sair da conta com a modal aberta nao deve deixar a conversa de outra pessoa na tela.
  useEffect(() => {
    if (!isAuthenticated && modal.open) closeMessages()
  }, [isAuthenticated, modal.open, closeMessages])

  if (!isAuthenticated) return null

  return (
    <Modal open={modal.open} onClose={closeMessages} title="Mensagens" size="lg">
      {modal.nickname ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => showConversation(null)}
            className="btn-ghost -ml-2 px-2 py-1 text-sm"
          >
            <ChevronLeft size={16} /> <Mail size={14} /> Todas as conversas
          </button>
          <MessageThread key={modal.nickname} nickname={modal.nickname} onNavigate={closeMessages} />
        </div>
      ) : (
        <ConversationList onSelect={showConversation} />
      )}
    </Modal>
  )
}

/** Botao que abre a modal (opcionalmente ja numa conversa). Mantem o visual de quem o usa. */
export function OpenMessagesButton({ nickname = null, className, children }) {
  const { openMessages } = useMessaging()
  return (
    <button type="button" onClick={() => openMessages(nickname)} className={className}>
      {children}
    </button>
  )
}

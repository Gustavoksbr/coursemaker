import { Modal } from '@/components/ui/Modal'
import { NicknameForm } from './NicknameForm'

/**
 * Interrupts a "create course" / "create post" click for someone who is authenticated but has not
 * claimed a nickname yet. Dismissible: cancelling just leaves the user browsing, same as before
 * they clicked - only the create action itself stays blocked.
 */
export function NicknameGateModal({ open, onClose, onSuccess }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Escolha seu nickname"
      description="Ele forma a URL do seu perfil e do seu conteudo, e nao pode ser alterado depois. Precisamos dele antes de criar algo novo."
      size="sm"
    >
      <NicknameForm onSuccess={onSuccess} submitLabel="Continuar e criar" />
    </Modal>
  )
}

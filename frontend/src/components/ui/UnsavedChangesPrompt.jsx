import { ConfirmModal } from '@/components/ui/Modal'

/** Pairs with `useUnsavedChangesGuard`: renders the confirm dialog when it blocks a navigation. */
export function UnsavedChangesPrompt({ blocker }) {
  return (
    <ConfirmModal
      open={blocker.state === 'blocked'}
      onClose={() => blocker.reset()}
      onConfirm={() => blocker.proceed()}
      title="Sair sem salvar?"
      message="Voce tem alteracoes nao salvas que serao perdidas."
      confirmLabel="Sair sem salvar"
    />
  )
}

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/context/ToastContext'
import { createFolder, renameFolder } from '@/api/library'
import { errorMessage } from '@/lib/api'

/** Create-or-rename modal: pass `folder` to rename it, omit it to create a new one. */
export function FolderModal({ open, onClose, folder }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState('')
  const isEditing = Boolean(folder)

  useEffect(() => {
    if (open) setName(folder?.name ?? '')
  }, [open, folder])

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => (isEditing ? renameFolder(folder.id, name.trim()) : createFolder(name.trim())),
    onSuccess: () => {
      // Every area-filtered variant of the folder list/detail queries shares this prefix.
      queryClient.invalidateQueries({ queryKey: ['library', 'folders'] })
      toast.success(isEditing ? 'Pasta renomeada.' : 'Pasta criada.')
      onClose()
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel salvar a pasta.')),
  })

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Renomear pasta' : 'Nova pasta'} size="sm">
      <div className="space-y-4">
        <Field label="Nome da pasta" htmlFor="folder-name" required>
          <Input
            id="folder-name"
            autoFocus
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Quero revisar"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && name.trim()) submit()
            }}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => submit()} loading={isPending} disabled={!name.trim()}>
            {isEditing ? 'Salvar' : 'Criar pasta'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

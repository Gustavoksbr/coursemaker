import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'
import { SaveToFolderModal } from './SaveToFolderModal'

/**
 * Bookmark trigger for the library. Clicking it always opens the folder picker
 * (SaveToFolderModal) -- there is no one-click "favorite" toggle, since Favoritos is just one of
 * the folders. The fill state adopts the modal's result immediately so the icon does not have
 * to wait on the parent list to refetch.
 */
export function SaveToLibraryButton({ kind, contentId, saved, onChange, size = 'md', className }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [localSaved, setLocalSaved] = useState(saved)
  const lastSavedProp = useRef(saved)

  // Adopt fresher data from the parent (a genuine refetch), but only when the prop itself
  // changed since we last saw it -- comparing against local state instead would re-fire on every
  // render after our own save and permanently clobber the icon back to the pre-save value,
  // since most parents (list views) never pass `onChange` and so never refetch at all.
  if (!open && lastSavedProp.current !== saved) {
    lastSavedProp.current = saved
    setLocalSaved(saved)
  }

  const iconSize = size === 'sm' ? 14 : 16

  const handleClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={localSaved ? 'Salvo na biblioteca - editar' : 'Salvar na biblioteca'}
        title={localSaved ? 'Salvo na biblioteca' : 'Salvar na biblioteca'}
        className={cn(
          'inline-flex items-center rounded-lg p-1 transition-colors',
          localSaved ? 'text-brand-400' : 'text-slate-400 hover:text-brand-400',
          className,
        )}
      >
        <Bookmark size={iconSize} className={cn(localSaved && 'fill-current')} />
      </button>

      <SaveToFolderModal
        open={open}
        onClose={() => setOpen(false)}
        kind={kind}
        contentId={contentId}
        onChange={(status) => {
          setLocalSaved(status.saved)
          onChange?.(status)
        }}
      />
    </>
  )
}

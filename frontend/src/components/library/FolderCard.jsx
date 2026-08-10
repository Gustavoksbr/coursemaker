import { Link } from 'react-router-dom'
import { Bookmark, Folder } from 'lucide-react'
import { plural } from '@/lib/format'

export function FolderCard({ folder }) {
  // Favoritos gets the same bookmark the save button uses, so the two read as the same thing.
  const Icon = folder.isDefault ? Bookmark : Folder

  return (
    <Link
      to={`/biblioteca/pastas/${folder.id}`}
      className="card flex items-center gap-3 p-4 hover:border-brand-500"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-400">
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-100">{folder.name}</p>
        <p className="text-xs text-slate-500">{plural(folder.itemCount, 'item', 'itens')}</p>
      </div>
    </Link>
  )
}

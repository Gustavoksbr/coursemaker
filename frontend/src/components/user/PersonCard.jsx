import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'

export function PersonCard({ person }) {
  return (
    <Link
      to={`/users/${person.nickname}`}
      className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 hover:border-slate-600"
    >
      <Avatar src={person.image} name={person.name} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-100">{person.name}</p>
        <p className="truncate text-xs text-brand-400">@{person.nickname}</p>
        {person.bio && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{person.bio}</p>}
      </div>
    </Link>
  )
}

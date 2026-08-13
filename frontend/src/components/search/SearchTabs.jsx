import { cn } from '@/lib/cn'

/** Tab strip for the search page - visual style matches PublicProfilePage's own tab strip. */
export function SearchTabs({ active, onChange, tabs }) {
  return (
    <div className="border-b border-slate-800">
      <div className="flex gap-1 overflow-x-auto overflow-y-hidden">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-current={active === key ? 'true' : undefined}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              active === key
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200',
            )}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
    </div>
  )
}

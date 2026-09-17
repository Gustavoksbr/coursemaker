import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/Field'
import { useToast } from '@/context/ToastContext'
import { useDebounce } from '@/hooks/useDebounce'
import { adminKeys, setHomePicks } from '@/api/admin'
import { errorMessage } from '@/lib/api'

/**
 * One content kind's home-curation picker: the currently chosen items in order (reorder with the
 * arrows, remove with the X) plus a search box to add more. Every change saves immediately - the
 * whole ordered id list is sent on each edit, same "no separate save step" pattern as the block/
 * feature toggles elsewhere in the admin.
 */
export function HomePicksEditor({ kind, title, emptyHint, items, normalize, search }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [q, setQ] = useState('')
  const debouncedQ = useDebounce(q, 300)
  const [resultIds, setResultIds] = useState([])
  const poolRef = useRef(new Map())

  items.forEach((item) => poolRef.current.set(item.id, normalize(item)))

  useEffect(() => {
    let cancelled = false
    if (!debouncedQ.trim()) {
      setResultIds([])
      return undefined
    }
    search(debouncedQ).then((found) => {
      if (cancelled) return
      found.forEach((item) => poolRef.current.set(item.id, normalize(item)))
      setResultIds(found.map((item) => item.id))
    })
    return () => {
      cancelled = true
    }
    // `search`/`normalize` are re-created every render by the caller; only the debounced term
    // should actually re-trigger the lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ])

  const { mutate: save, isPending } = useMutation({
    mutationFn: (ids) => setHomePicks(kind, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.homePicks })
      queryClient.invalidateQueries({ queryKey: ['home'] })
      queryClient.invalidateQueries({ queryKey: ['search'] })
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel salvar a escolha.')),
  })

  const currentIds = items.map((item) => item.id)
  const currentIdSet = new Set(currentIds)

  const move = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= currentIds.length) return
    const next = [...currentIds]
    ;[next[index], next[target]] = [next[target], next[index]]
    save(next)
  }

  const remove = (id) => save(currentIds.filter((existing) => existing !== id))

  const add = (id) => {
    if (currentIdSet.has(id)) return
    save([...currentIds, id])
    setQ('')
    setResultIds([])
  }

  const candidateIds = resultIds.filter((id) => !currentIdSet.has(id))

  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>

      {items.length === 0 ? (
        <p className="text-xs text-slate-500">{emptyHint}</p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-700">
          {items.map((item, index) => {
            const info = normalize(item)
            return (
              <li key={info.id} className="flex items-center gap-2 px-3 py-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={index === 0 || isPending}
                    onClick={() => move(index, -1)}
                    className="text-slate-500 hover:text-slate-200 disabled:opacity-30"
                    aria-label="Mover para cima"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1 || isPending}
                    onClick={() => move(index, 1)}
                    className="text-slate-500 hover:text-slate-200 disabled:opacity-30"
                    aria-label="Mover para baixo"
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-200">{info.title}</p>
                  {info.subtitle && <p className="truncate text-xs text-slate-500">{info.subtitle}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => remove(info.id)}
                  disabled={isPending}
                  className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-red-400"
                  aria-label="Remover"
                >
                  <X size={14} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="relative">
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={`Buscar ${title.toLowerCase()}...`}
        />
        {candidateIds.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
            {candidateIds.map((id) => {
              const info = poolRef.current.get(id)
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => add(id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
                  >
                    <Plus size={14} className="shrink-0 text-brand-400" />
                    <span className="min-w-0 flex-1 truncate">{info?.title}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

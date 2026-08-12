import { ContentBadges } from '@/components/ui/Badge'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { TrilhaItemsList } from '@/components/trilha/TrilhaItemsList'
import { PreviewOverlay } from '@/components/shared/PreviewOverlay'

/**
 * Owner-only preview of a trilha, built from the editor's local drafts: the settings form
 * (title/description/...) and the structure draft (steps/items), neither of which may have been
 * saved yet - which is the whole point, since adding a course and immediately checking "ver
 * publicada" would otherwise still show the old structure until the next flush.
 */
export function TrilhaPreview({ trilha, structureDraft, onClose }) {
  return (
    <PreviewOverlay onClose={onClose}>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <header className="space-y-4">
          <ContentBadges status={trilha.status} visibility={trilha.visibility} featured={trilha.featured} />

          <h1 className="break-words text-3xl font-bold tracking-tight text-slate-100">{trilha.title}</h1>

          <Thumbnail src={trilha.thumbnailUrl} alt={trilha.title} className="rounded-xl" />

          {trilha.description && <p className="break-words text-lg text-slate-400">{trilha.description}</p>}

          {trilha.categories?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {trilha.categories.map((category) => (
                <span key={category} className="badge bg-slate-700/60 text-slate-300">
                  {category}
                </span>
              ))}
            </div>
          )}
        </header>

        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-100">Sequencia</h2>
          <TrilhaItemsList
            structure={{ steps: structureDraft.steps, ungroupedItems: structureDraft.ungroupedItems }}
            canTrackProgress={false}
            onToggleComplete={() => {}}
          />
        </section>
      </div>
    </PreviewOverlay>
  )
}

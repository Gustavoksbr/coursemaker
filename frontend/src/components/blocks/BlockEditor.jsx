import { useState } from 'react'
import { Code2, FileText, Image as ImageIcon, Video } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Select, Textarea } from '@/components/ui/Field'
import { RichTextEditor } from './RichTextEditor'
import { ImageUploadField } from './ImageUploadField'
import { BLOCK_TYPE, LIMITS } from '@/lib/constants'
import { HIGHLIGHTABLE_LANGUAGES } from '@/lib/highlighter'
import { youtubeId } from '@/lib/youtube'

export const BLOCK_META = {
  [BLOCK_TYPE.TEXT]: { label: 'Texto', icon: FileText },
  [BLOCK_TYPE.CODE]: { label: 'Codigo', icon: Code2 },
  [BLOCK_TYPE.IMAGE]: { label: 'Imagem', icon: ImageIcon },
  [BLOCK_TYPE.VIDEO]: { label: 'Video', icon: Video },
}

/**
 * Edits one block. Changes are local until "Salvar", so cancelling really discards them — the
 * parent keeps the draft visible in preview mode while it is open.
 */
export function BlockEditor({ block, onSave, onCancel, onDraftChange, saving }) {
  const [draft, setDraft] = useState({
    type: block.type,
    content: block.content ?? '',
    language: block.language ?? 'javascript',
  })

  const update = (patch) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    onDraftChange?.(next)
  }

  const videoId = draft.type === BLOCK_TYPE.VIDEO ? youtubeId(draft.content) : null
  const invalidVideo = draft.type === BLOCK_TYPE.VIDEO && draft.content.trim() && !videoId

  return (
    <div className="space-y-4 rounded-lg border border-brand-500/50 bg-slate-800 p-4">
      {draft.type === BLOCK_TYPE.TEXT && (
        <RichTextEditor value={draft.content} onChange={(content) => update({ content })} />
      )}

      {draft.type === BLOCK_TYPE.CODE && (
        <div className="space-y-3">
          <Field label="Linguagem" htmlFor="block-language">
            <Select
              id="block-language"
              value={draft.language}
              onChange={(event) => update({ language: event.target.value })}
              className="w-52"
            >
              {HIGHLIGHTABLE_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </Select>
          </Field>
          <Textarea
            rows={10}
            maxLength={LIMITS.BLOCK_CONTENT}
            value={draft.content}
            onChange={(event) => update({ content: event.target.value })}
            placeholder="Cole seu codigo aqui..."
            aria-label="Codigo"
            className="font-mono text-[13px]"
            spellCheck={false}
          />
        </div>
      )}

      {draft.type === BLOCK_TYPE.IMAGE && (
        <Field label="Imagem" hint="Cole a URL da imagem ou envie um arquivo.">
          <ImageUploadField value={draft.content} onChange={(content) => update({ content })} />
        </Field>
      )}

      {draft.type === BLOCK_TYPE.VIDEO && (
        <Field
          label="URL do YouTube"
          htmlFor="block-video"
          error={invalidVideo ? 'Nao reconhecemos este link do YouTube.' : undefined}
          hint="Ex.: https://www.youtube.com/watch?v=..."
        >
          <input
            id="block-video"
            type="url"
            maxLength={LIMITS.URL}
            className="input"
            value={draft.content}
            onChange={(event) => update({ content: event.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          {videoId && (
            <div className="mt-3 aspect-video overflow-hidden rounded-lg">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                title="Previa do video"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          )}
        </Field>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button size="sm" onClick={() => onSave(draft)} loading={saving} disabled={invalidVideo}>
          Salvar bloco
        </Button>
      </div>
    </div>
  )
}

/** The "+ Adicionar bloco" row, one button per block type. */
export function AddBlockBar({ onAdd, disabled }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-700 p-3">
      <span className="mr-1 text-sm text-slate-500">Adicionar bloco:</span>
      {Object.entries(BLOCK_META).map(([type, { label, icon: Icon }]) => (
        <button
          key={type}
          type="button"
          onClick={() => onAdd(type)}
          disabled={disabled}
          className="btn-ghost border border-slate-700 text-xs hover:border-brand-500 disabled:opacity-50"
        >
          <Icon size={14} /> {label}
        </button>
      ))}
    </div>
  )
}

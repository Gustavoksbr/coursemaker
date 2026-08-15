import { Code2, FileText, Image as ImageIcon, Video } from 'lucide-react'
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
 * Edits one block. Always live: every change writes straight into the parent draft, there is no
 * separate "Salvar bloco" step - the block content only reaches the server when the page's own
 * "Salvar alteracoes" flushes the whole draft.
 */
export function BlockEditor({ block, onChange }) {
  const content = block.content ?? ''
  const language = block.language ?? 'javascript'

  const videoId = block.type === BLOCK_TYPE.VIDEO ? youtubeId(content) : null
  const invalidVideo = block.type === BLOCK_TYPE.VIDEO && content.trim() && !videoId

  return (
    <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-800 p-4">
      {block.type === BLOCK_TYPE.TEXT && (
        <RichTextEditor value={content} onChange={(next) => onChange({ content: next })} />
      )}

      {block.type === BLOCK_TYPE.CODE && (
        <div className="space-y-3">
          <Field label="Linguagem" htmlFor={`block-language-${block.id}`}>
            <Select
              id={`block-language-${block.id}`}
              value={language}
              onChange={(event) => onChange({ language: event.target.value })}
              className="w-52"
            >
              {HIGHLIGHTABLE_LANGUAGES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Textarea
            rows={10}
            maxLength={LIMITS.BLOCK_CONTENT}
            value={content}
            onChange={(event) => onChange({ content: event.target.value })}
            placeholder="Cole seu codigo aqui..."
            aria-label="Codigo"
            className="font-mono text-[13px]"
            spellCheck={false}
          />
        </div>
      )}

      {block.type === BLOCK_TYPE.IMAGE && (
        <Field label="Imagem" hint="Cole a URL da imagem ou envie um arquivo.">
          <ImageUploadField value={content} onChange={(next) => onChange({ content: next })} />
        </Field>
      )}

      {block.type === BLOCK_TYPE.VIDEO && (
        <Field
          label="URL do YouTube"
          htmlFor={`block-video-${block.id}`}
          error={invalidVideo ? 'Nao reconhecemos este link do YouTube.' : undefined}
          hint="Ex.: https://www.youtube.com/watch?v=..."
        >
          <input
            id={`block-video-${block.id}`}
            type="url"
            maxLength={LIMITS.URL}
            className="input"
            value={content}
            onChange={(event) => onChange({ content: event.target.value })}
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

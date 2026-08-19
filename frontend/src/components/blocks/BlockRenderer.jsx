import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { FileQuestion } from 'lucide-react'
import { CodeBlock } from './CodeBlock'
import { QuestionBlock } from './QuestionBlock'
import { BLOCK_TYPE } from '@/lib/constants'
import { youtubeEmbedUrl } from '@/lib/youtube'
import { cn } from '@/lib/cn'

/**
 * Renders one content block, exactly as the public view shows it — the editor's preview mode reuses
 * this component so what you see really is what gets published.
 */
export function BlockRenderer({ block }) {
  switch (block.type) {
    case BLOCK_TYPE.TEXT:
      return <TextBlock html={block.content} />
    case BLOCK_TYPE.CODE:
      return <CodeBlock code={block.content ?? ''} language={block.language} />
    case BLOCK_TYPE.IMAGE:
      return <ImageBlock src={block.content} />
    case BLOCK_TYPE.VIDEO:
      return <VideoBlock url={block.content} />
    case BLOCK_TYPE.QUESTION:
      return <QuestionBlock content={block.content} />
    default:
      return (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <FileQuestion size={16} /> Tipo de bloco desconhecido: {block.type}
        </p>
      )
  }
}

function TextBlock({ html }) {
  // The backend sanitises on write; this is the second line of defence, on read.
  const safe = useMemo(() => DOMPurify.sanitize(html ?? '', { USE_PROFILES: { html: true } }), [html])
  if (!safe.trim()) return null
  return <div className="rich-text" dangerouslySetInnerHTML={{ __html: safe }} />
}

function ImageBlock({ src }) {
  if (!src?.trim()) return null
  return (
    <figure>
      <img src={src} alt="" loading="lazy" className="mx-auto max-h-[70vh] rounded-lg" />
    </figure>
  )
}

function VideoBlock({ url }) {
  const embedUrl = youtubeEmbedUrl(url)

  if (!embedUrl) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
        Nao foi possivel reconhecer este link do YouTube.
      </p>
    )
  }

  return (
    <div className="aspect-video overflow-hidden rounded-lg bg-slate-950">
      <iframe
        src={embedUrl}
        title="Video da aula"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  )
}

/** The full list of blocks, in order. */
export function BlockList({ blocks, className, emptyMessage = 'Esta licao ainda nao tem conteudo.' }) {
  if (!blocks?.length) {
    return <p className={cn('text-sm text-slate-500', className)}>{emptyMessage}</p>
  }

  return (
    <div className={cn('space-y-6', className)}>
      {blocks.map((block) => (
        <BlockRenderer key={block.id ?? block.tempId} block={block} />
      ))}
    </div>
  )
}

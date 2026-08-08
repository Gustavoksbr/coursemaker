import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react'
import { cn } from '@/lib/cn'

/** WYSIWYG editor for `text` blocks. Emits HTML, which the backend sanitises before storing. */
export function RichTextEditor({ value, onChange, placeholder = 'Escreva aqui...' }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: { HTMLAttributes: { class: 'rich-text-code' } },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        // Anything but http(s) in an href is a scripting vector.
        protocols: ['http', 'https', 'mailto'],
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? '',
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    editorProps: {
      attributes: { class: 'rich-text px-3 py-3' },
    },
  })

  // Adopt content pushed from outside (switching blocks reuses the same editor instance).
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value ?? '', false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value])

  if (!editor) return null

  const setLink = () => {
    const previous = editor.getAttributes('link').href ?? ''
    const url = window.prompt('URL do link:', previous)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900 focus-within:border-brand-500">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-700 bg-slate-800/60 px-2 py-1.5">
        <ToolbarButton
          icon={Bold}
          label="Negrito"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={Italic}
          label="Italico"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={Strikethrough}
          label="Tachado"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <Divider />
        <ToolbarButton
          icon={Heading2}
          label="Titulo"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          icon={Heading3}
          label="Subtitulo"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <Divider />
        <ToolbarButton
          icon={List}
          label="Lista"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={ListOrdered}
          label="Lista numerada"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          icon={Quote}
          label="Citacao"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          icon={Code}
          label="Codigo em linha"
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
        <ToolbarButton
          icon={LinkIcon}
          label="Link"
          active={editor.isActive('link')}
          onClick={setLink}
        />
        <Divider />
        <ToolbarButton
          icon={Undo2}
          label="Desfazer"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarButton
          icon={Redo2}
          label="Refazer"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarButton({ icon: Icon, label, active, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'rounded p-1.5 transition-colors disabled:opacity-40',
        active ? 'bg-brand-500/20 text-brand-300' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200',
      )}
    >
      <Icon size={15} />
    </button>
  )
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-slate-700" />
}

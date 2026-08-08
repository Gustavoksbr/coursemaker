import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ImagePlus, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/Field'
import { useToast } from '@/context/ToastContext'
import { getCloudinaryStatus, getCloudinaryUploadSignature, uploadKeys } from '@/api/uploads'
import { cn } from '@/lib/cn'
import { LIMITS } from '@/lib/constants'

/**
 * Image URL field, with an optional Cloudinary upload (click-to-browse or drag-and-drop) when the
 * backend has Cloudinary configured. The field always accepts a pasted URL either way - the
 * backend only ever stores the URL, never the file.
 *
 * The upload itself is signed server-side (see /api/v1/uploads/cloudinary-signature): the API
 * secret never reaches the browser, only a per-upload signature that is only valid for this exact
 * request.
 */
export function ImageUploadField({ value, onChange, placeholder = 'https://...' }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const toast = useToast()

  // Shared across every field on the page - one request per session, not one per block.
  const { data: cloudinaryEnabled } = useQuery({
    queryKey: uploadKeys.cloudinaryStatus,
    queryFn: getCloudinaryStatus,
    staleTime: Infinity,
  })

  const upload = async (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Envie um arquivo de imagem.')
      return
    }

    setUploading(true)
    try {
      const signature = await getCloudinaryUploadSignature()

      const body = new FormData()
      body.append('file', file)
      body.append('api_key', signature.apiKey)
      body.append('timestamp', signature.timestamp)
      body.append('signature', signature.signature)
      body.append('folder', signature.folder)

      // Deliberately a bare fetch: this goes straight to Cloudinary, not to our API, so it must
      // not carry the Authorization header our axios instance attaches.
      const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
        method: 'POST',
        body,
      })
      if (!response.ok) throw new Error('upload failed')
      const data = await response.json()
      onChange(data.secure_url)
    } catch {
      toast.error('Falha no upload. Cole a URL da imagem manualmente.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (file) upload(file)
  }

  return (
    <div className="space-y-1.5">
      <div
        onDragOver={(event) => {
          if (!cloudinaryEnabled || uploading) return
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={cloudinaryEnabled && !uploading ? handleDrop : undefined}
        className={cn(
          'flex gap-2 rounded-lg transition-shadow',
          dragOver && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-slate-900',
        )}
      >
        <Input
          type="url"
          maxLength={LIMITS.URL}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label="URL da imagem"
        />
        {cloudinaryEnabled && (
          <>
            <button
              type="button"
              className="btn-secondary shrink-0"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              title="Enviar imagem (ou arraste e solte aqui)"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) upload(file)
              }}
            />
          </>
        )}
      </div>

      {cloudinaryEnabled && (
        <p className="text-[11px] text-slate-600">
          Clique no botao ou arraste uma imagem para esta area.
        </p>
      )}

      {value?.trim() && (
        <img
          src={value}
          alt=""
          className="max-h-48 rounded-lg border border-slate-700 object-contain"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
          onLoad={(event) => {
            event.currentTarget.style.display = ''
          }}
        />
      )}
    </div>
  )
}

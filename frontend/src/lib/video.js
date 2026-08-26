import { youtubeId } from './youtube'

/**
 * Extracts the file id from a Google Drive file-sharing URL (`/file/d/[ID]/...` or `?id=[ID]`).
 * Folder URLs (`/drive/folders/...`) are not files and intentionally do not match.
 */
export function googleDriveFileId(url) {
  if (!url) return null
  const trimmed = url.trim()

  let parsed
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  if (!parsed.hostname.replace(/^www\./, '').endsWith('drive.google.com')) return null

  const match = parsed.pathname.match(/\/file\/d\/([^/]+)/)
  if (match) return match[1]

  return parsed.searchParams.get('id')
}

/**
 * Detects a supported video URL - YouTube or Google Drive - and returns its embeddable iframe src.
 * Drive links rarely end in `.mp4` (Drive serves a viewer page, not the raw file), which is why
 * video blocks cannot just treat "looks like a URL" as good enough: each provider needs its own
 * embed-url shape.
 */
export function videoEmbedUrl(url) {
  const ytId = youtubeId(url)
  if (ytId) return `https://www.youtube-nocookie.com/embed/${ytId}`

  const driveId = googleDriveFileId(url)
  if (driveId) return `https://drive.google.com/file/d/${driveId}/preview`

  return null
}

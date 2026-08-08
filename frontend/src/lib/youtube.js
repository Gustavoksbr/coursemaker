/**
 * Extracts the video id from the YouTube URL shapes people actually paste:
 * watch?v=, youtu.be/, /embed/, /shorts/ and /live/.
 */
export function youtubeId(url) {
  if (!url) return null
  const trimmed = url.trim()

  // A bare id was pasted.
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed

  let parsed
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  const host = parsed.hostname.replace(/^www\./, '')
  if (host === 'youtu.be') {
    return parsed.pathname.slice(1).split('/')[0] || null
  }
  // Match the domain exactly or as a subdomain (m., music., ...). A bare `endsWith` would also
  // accept lookalikes such as `notyoutube.com`, which we would then load in an iframe.
  if (!isYoutubeHost(host)) {
    return null
  }

  const fromQuery = parsed.searchParams.get('v')
  if (fromQuery) return fromQuery

  const match = parsed.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]+)/)
  return match ? match[2] : null
}

const YOUTUBE_DOMAINS = ['youtube.com', 'youtube-nocookie.com']

function isYoutubeHost(host) {
  return YOUTUBE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))
}

export function youtubeEmbedUrl(url) {
  const id = youtubeId(url)
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
}

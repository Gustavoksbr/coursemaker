import { describe, expect, it } from 'vitest'
import { youtubeEmbedUrl, youtubeId } from './youtube'

describe('youtubeId', () => {
  it('reads the id from every URL shape people paste', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('keeps working without the protocol or the www', () => {
    expect(youtubeId('youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('ignores extra query parameters and timestamps', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL1')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe('dQw4w9WgXcQ')
  })

  it('accepts a bare id', () => {
    expect(youtubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('accepts real YouTube subdomains', () => {
    expect(youtubeId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://music.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('rejects anything that is not a YouTube link', () => {
    expect(youtubeId('https://vimeo.com/12345')).toBeNull()
    expect(youtubeId('nao e uma url')).toBeNull()
    expect(youtubeId('')).toBeNull()
    expect(youtubeId(null)).toBeNull()
  })

  it('rejects lookalike domains, which would otherwise end up in an iframe', () => {
    expect(youtubeId('https://notyoutube.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(youtubeId('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(youtubeId('https://evil-youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull()
  })
})

describe('youtubeEmbedUrl', () => {
  it('builds a privacy-preserving embed URL', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })

  it('returns null when the link is unusable, so the caller can warn', () => {
    expect(youtubeEmbedUrl('https://vimeo.com/12345')).toBeNull()
  })
})

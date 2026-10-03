import { describe, expect, it } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('lowercases and joins words with hyphens', () => {
    expect(slugify('Curso de Java')).toBe('curso-de-java')
  })

  it('strips pt-BR accents instead of escaping them', () => {
    // Must match SlugGeneratorService on the backend, which normalises to NFD and drops the marks.
    expect(slugify('Introdução à Programação')).toBe('introducao-a-programacao')
    expect(slugify('Ação, Coração e Manutenção')).toBe('acao-coracao-e-manutencao')
  })

  it('collapses runs of separators and trims the edges', () => {
    expect(slugify('  --Spring   Boot!!  na   Prática-- ')).toBe('spring-boot-na-pratica')
  })

  it('returns an empty string for empty input', () => {
    expect(slugify('')).toBe('')
    expect(slugify(null)).toBe('')
    expect(slugify(undefined)).toBe('')
  })

  it('drops characters outside the slug alphabet', () => {
    expect(slugify('C++ & C#')).toBe('c-c')
    expect(slugify('日本語')).toBe('')
  })

  it('never ends with a hyphen after truncating', () => {
    const slug = slugify('a'.repeat(198) + ' fim')
    expect(slug.length).toBeLessThanOrEqual(200)
    expect(slug.endsWith('-')).toBe(false)
  })
})

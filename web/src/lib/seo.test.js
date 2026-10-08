import { describe, expect, it } from 'vitest'
import { canonicalUrl, DEFAULT_DESCRIPTION, DEFAULT_TITLE, pageTitle, plainDescription, SITE_URL } from './seo'

describe('pageTitle', () => {
  it('acrescenta o nome do site e cai no padrao sem titulo', () => {
    expect(pageTitle('Curso de SQL')).toBe('Curso de SQL | CourseMaker')
    expect(pageTitle('  ')).toBe(DEFAULT_TITLE)
    expect(pageTitle(undefined)).toBe(DEFAULT_TITLE)
  })
})

describe('plainDescription', () => {
  it('tira marcacao e espacos repetidos', () => {
    expect(plainDescription('<p>Ola   <b>mundo</b></p>')).toBe('Ola mundo')
  })

  it('corta na palavra e termina com reticencias', () => {
    const text = plainDescription('palavra '.repeat(60))
    expect(text.length).toBeLessThanOrEqual(161)
    expect(text.endsWith('…')).toBe(true)
  })

  it('usa a descricao padrao quando nao ha texto', () => {
    expect(plainDescription(null)).toBe(DEFAULT_DESCRIPTION)
    expect(plainDescription('   ')).toBe(DEFAULT_DESCRIPTION)
  })
})

describe('canonicalUrl', () => {
  it('usa o dominio do site e tira a barra final', () => {
    expect(canonicalUrl('/courses/ana/sql/')).toBe(`${SITE_URL}/courses/ana/sql`)
    expect(canonicalUrl('/')).toBe(`${SITE_URL}/`)
    expect(canonicalUrl('')).toBe(`${SITE_URL}/`)
  })
})

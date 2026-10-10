import { describe, expect, it } from 'vitest'
import { courseThumb } from './courseThumb'

describe('courseThumb (miniatura de codigo da home)', () => {
  it('reconhece a linguagem pelo nome do curso', () => {
    expect(courseThumb({ name: 'Python para Análise de Dados' }).tag).toBe('python')
    expect(courseThumb({ name: 'C++: Fundamentos' }).tag).toBe('c++')
    expect(courseThumb({ name: 'HTML5 e CSS3' }).tag).toBe('html/css')
  })

  it('JavaScript nao vira Java', () => {
    expect(courseThumb({ name: 'JavaScript do zero' }).tag).toBe('javascript')
    expect(courseThumb({ name: 'Java orientado a objetos' }).tag).toBe('java')
  })

  it('usa as categorias e ignora acentos', () => {
    expect(courseThumb({ name: 'Curso introdutório', categories: ['Lógica'] }).tag).toBe('lógica')
  })

  it('curso sem codigo mostra um resumo em texto', () => {
    const thumb = courseThumb({
      name: 'História do Brasil',
      description: 'Da chegada portuguesa ao governo-geral',
      categories: ['história'],
      lessonCount: 10,
    })
    expect(thumb.tag).toBe('história')
    expect(thumb.code).toContain('sobre o curso')
    expect(thumb.code).toContain('10 aulas')
  })
})

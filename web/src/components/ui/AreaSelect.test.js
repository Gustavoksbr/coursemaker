import { describe, expect, it } from 'vitest'
import { technologyFirst } from './AreaSelect'

describe('technologyFirst', () => {
  const areas = [
    { id: 1, name: 'Ciências Humanas', slug: 'ciencias-humanas' },
    { id: 2, name: 'Jogos', slug: 'jogos' },
    { id: 3, name: 'Tecnologia', slug: 'tecnologia' },
  ]

  it('puts Tecnologia first and keeps the others in order', () => {
    expect(technologyFirst(areas).map((a) => a.id)).toEqual([3, 1, 2])
  })

  it('matches by name too, ignoring case and accents', () => {
    const list = [{ id: 1, name: 'Jogos', slug: 'jogos' }, { id: 2, name: 'TECNOLOGIA', slug: 'x' }]
    expect(technologyFirst(list).map((a) => a.id)).toEqual([2, 1])
  })

  it('leaves the list alone without Tecnologia, and tolerates no data', () => {
    expect(technologyFirst(areas.slice(0, 2)).map((a) => a.id)).toEqual([1, 2])
    expect(technologyFirst(undefined)).toBeUndefined()
  })
})

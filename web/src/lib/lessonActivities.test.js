import { describe, expect, it } from 'vitest'
import {
  courseActivitiesByModule,
  lessonActivities,
  lessonActivityCounts,
  lessonKind,
} from './lessonActivities'

const text = { id: 't', type: 'text' }
const video = { id: 'v', type: 'video' }
const question = (id) => ({ id, type: 'question' })
const exercise = (id, title) => ({ id, type: 'code_exercise', content: JSON.stringify({ title }) })

describe('lessonKind', () => {
  it('is reading for text, code and image only', () => {
    expect(lessonKind([text, { type: 'code' }, { type: 'image' }])).toBe('reading')
    expect(lessonKind([])).toBe('reading')
  })

  it('is video when there is a video block', () => {
    expect(lessonKind([text, video])).toBe('video')
  })

  it('is activity when there is a question or an exercise, whatever else is there', () => {
    expect(lessonKind([text, video, question('q')])).toBe('activity')
    expect(lessonKind([exercise('e', 'x')])).toBe('activity')
  })
})

describe('lessonActivities', () => {
  it('numbers questions within the lesson and uses the exercise title', () => {
    const lesson = { id: 'l1', blocks: [text, question('q1'), exercise('e1', 'Soma'), question('q2')] }
    expect(lessonActivities(lesson).map((a) => [a.kind, a.title])).toEqual([
      ['question', 'Questao 1 de 2'],
      ['exercise', 'Soma'],
      ['question', 'Questao 2 de 2'],
    ])
  })

  it('does not number a lone question and tolerates an exercise without title', () => {
    const lesson = { id: 'l1', blocks: [question('q1'), { id: 'e', type: 'code_exercise', content: 'not json' }] }
    expect(lessonActivities(lesson).map((a) => a.title)).toEqual(['Questao', 'Exercicio de codigo'])
  })
})

describe('progress counts', () => {
  const lesson = { id: 'l1', blocks: [question('q1'), exercise('e1', 'Soma')] }

  it('counts done activities from both id sets', () => {
    expect(lessonActivityCounts(lesson, new Set(['q1']), new Set())).toEqual({ done: 1, total: 2 })
    expect(lessonActivityCounts(lesson, new Set(['q1']), new Set(['e1']))).toEqual({ done: 2, total: 2 })
  })

  it('does not mix up a question id with an exercise id', () => {
    expect(lessonActivityCounts(lesson, new Set(['e1']), new Set(['q1']))).toEqual({ done: 0, total: 2 })
  })

  it('groups activities by module, skipping modules without any', () => {
    const modules = [
      { id: 'm1', title: 'Intro', lessons: [{ id: 'a', title: 'A', blocks: [text] }] },
      { id: 'm2', title: 'Funcoes', lessons: [{ id: 'b', title: 'B', blocks: [exercise('e1', 'Soma')] }] },
    ]
    const groups = courseActivitiesByModule(modules, new Set(), new Set(['e1']))
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ moduleNumber: 2, moduleTitle: 'Funcoes' })
    expect(groups[0].items[0]).toMatchObject({ title: 'Soma', lessonTitle: 'B', done: true })
  })
})

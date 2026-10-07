/**
 * O "servidor de mentira": recebe o método e o caminho de cada chamada a /api/v1 e devolve JSON montado a partir de
 * data.mjs. O que cada cena precisa de diferente (quem está logado, o que "Executar" devolve...) fica em `state`.
 */
import {
  AREAS, COMMENTS, CONVERSATIONS, COURSES, COURSE_BY_N, COURSE_ID, EX, GIT_LESSON, LESSONS, ME, NOTIFICATIONS, OWNER, PEOPLE, POSTS, SCHOOLS, SLUG,
  STUDENT, THREAD_WITH_PROF, TRILHAS, id, ownerSpec, postDetail, trilhaDetail,
} from './data.mjs'

export const state = {
  who: 'student',
  passed: [],
  lastCode: {},
  nextRun: null,
  nextSubmit: null,
  validate: null,
  unreadMessages: 1,
  unreadNotifications: 2,
}

const page = (items) => ({ items, page: 0, size: 20, totalItems: items.length, totalPages: 1, hasNext: false })
const persons = () => Object.values(PEOPLE).map((p) => ({ id: p.id, nickname: p.nickname, name: p.name, image: p.image, bio: p.bio }))

function lessonsOf(def) {
  return def.lessons.map((l, i) => ({ id: l.id, moduleId: l.moduleId, title: l.title, order: i, completed: state.passed.includes(l.id), blocks: l.blocks }))
}

/** Detalhe de um curso: o da padaria (com exercícios), o de Git (aula de leitura) ou um genérico para os demais. */
function courseDetail(slug) {
  const owner = state.who === 'owner'
  const base = {
    landingDescription: null, isOwner: false, canViewContent: true, requiresPassword: false, hasPassword: false,
    answeredQuestionBlockIds: [], passedExerciseBlockIds: [],
  }
  if (slug === COURSE_BY_N(1).slug) {
    const lessons = LESSONS.map((l, i) => ({ id: l.id, moduleId: id(i === 0 ? 10 : 11), title: l.title, order: i, completed: state.passed.includes(l.id), blocks: l.blocks }))
    const passed = Object.values(EX).filter((e) => state.passed.includes(e.lesson)).map((e) => e.block)
    return {
      ...base,
      summary: { ...COURSE_BY_N(1), enrolledByMe: !owner },
      landingDescription: 'Seu Zé abriu a Padaria Pão Quente e o sistema do caixa está cheio de pequenos erros. Em cada aula você conserta um trecho de código de verdade, com testes que dizem na hora se acertou.',
      modules: [
        { id: id(10), courseId: COURSE_ID, title: 'Antes de começar', description: null, order: 0, lessons: [lessons[0]] },
        { id: id(11), courseId: COURSE_ID, title: 'Prática: o caixa da padaria', description: null, order: 1, lessons: lessons.slice(1) },
      ],
      isOwner: owner,
      progress: { completedLessons: state.passed.length, totalLessons: lessons.length, percentage: Math.round((state.passed.length / lessons.length) * 100), completedLessonIds: state.passed },
      passedExerciseBlockIds: passed,
    }
  }
  if (slug === GIT_LESSON.course.slug) {
    const modules = GIT_LESSON.modules.map((m, mi) => ({
      id: m.id, courseId: GIT_LESSON.course.id, title: m.title, description: null, order: mi,
      lessons: m.lessons.map((l, li) => ({ id: l.id, moduleId: m.id, title: l.title, order: li, completed: mi === 0, blocks: l.blocks })),
    }))
    return {
      ...base, summary: { ...GIT_LESSON.course, enrolledByMe: true }, modules,
      landingDescription: 'Versionamento do jeito que se trabalha em equipe: commits, branches, pull requests e resolução de conflitos. Você termina o curso sabendo contribuir com projetos de verdade no GitHub.',
      progress: { completedLessons: 1, totalLessons: 4, percentage: 25, completedLessonIds: [GIT_LESSON.modules[0].lessons[0].id] },
    }
  }
  const course = COURSES.find((c) => c.slug === slug) ?? COURSES[1]
  const lessons = ['Introdução', 'Primeiros passos', 'Mão na massa', 'Revisão e próximos passos'].map((title, i) => ({
    id: id(8000 + i), moduleId: id(8100), title, order: i, completed: false,
    blocks: [{ id: id(8200 + i), parentId: id(8000 + i), type: 'text', content: `<p>${course.description}</p>`, language: null, order: 0 }],
  }))
  return {
    ...base, summary: course, modules: [{ id: id(8100), courseId: course.id, title: 'Conteúdo do curso', description: null, order: 0, lessons }], landingDescription: course.description,
    progress: { completedLessons: 0, totalLessons: lessons.length, percentage: 0, completedLessonIds: [] },
  }
}

function blocksOf(lessonId) {
  const fromPractice = LESSONS.find((l) => l.id === lessonId)
  if (fromPractice) return fromPractice.blocks
  for (const m of GIT_LESSON.modules) for (const l of m.lessons) if (l.id === lessonId) return l.blocks
  return []
}

export function answer(method, pathname, search) {
  let m
  const q = new URLSearchParams(search)

  // sessão e dados globais
  if (method === 'GET' && pathname === '/auth/me') return ME[state.who]
  if (method === 'GET' && pathname === '/areas') return AREAS
  if (method === 'GET' && pathname === '/schools') return SCHOOLS
  if (method === 'GET' && (m = pathname.match(/^\/schools\/([^/]+)$/))) return SCHOOLS.find((s) => s.slug === m[1]) ?? SCHOOLS[0]
  if (method === 'GET' && pathname === '/stats') return { courses: COURSES.length, trilhas: TRILHAS.length, posts: POSTS.length, creators: Object.keys(PEOPLE).length }
  if (method === 'GET' && pathname === '/site-settings') {
    return { heroTitle: 'Aprenda e ensine', heroHighlight: 'o que quiser', heroSubtitle: 'Cursos estruturados, posts e trilhas escritos por quem entende do assunto.', heroCtaLabel: null, heroCtaHref: null, announcement: null, announcementHref: null }
  }
  if (method === 'GET' && pathname === '/code-exercises/languages') {
    const all = ['javascript', 'python', 'typescript', 'php', 'ruby', 'java', 'csharp', 'cpp', 'c', 'go', 'rust', 'kotlin']
    return { function: all, output: all }
  }
  if (/unread-count$/.test(pathname)) return { count: pathname.startsWith('/messages') ? state.unreadMessages : state.unreadNotifications }

  // listas e perfis
  if (method === 'GET' && pathname === '/courses') return page(COURSES)
  if (method === 'GET' && pathname === '/trilhas') return page(TRILHAS)
  if (method === 'GET' && pathname === '/posts') return page(POSTS)
  if (method === 'GET' && pathname === '/users/search') return page(persons())
  if (method === 'GET' && pathname === '/search') {
    const term = (q.get('q') ?? '').toLowerCase()
    const hit = (s) => !term || JSON.stringify(s).toLowerCase().includes(term)
    const pick = (list) => list.filter(hit)
    return {
      query: q.get('q') ?? '',
      courses: { items: pick(COURSES).slice(0, 6), total: pick(COURSES).length }, posts: { items: pick(POSTS), total: pick(POSTS).length },
      trilhas: { items: pick(TRILHAS), total: pick(TRILHAS).length }, people: { items: persons().filter(hit), total: persons().filter(hit).length },
    }
  }
  if (method === 'GET' && (m = pathname.match(/^\/users\/([^/]+)$/))) {
    const p = Object.values(PEOPLE).find((x) => x.nickname === m[1]) ?? PEOPLE.prof
    const key = Object.keys(PEOPLE).find((k) => PEOPLE[k] === p)
    return { id: p.id, nickname: p.nickname, name: p.name, image: null, bio: p.bio, stacks: key === 'prof' ? ['Python', 'Java', 'Rust'] : ['JavaScript'], createdAt: '2026-05-01T12:00:00Z', deleted: false,
      courses: COURSES.filter((c) => c.owner.nickname === p.nickname), posts: POSTS.filter((x) => x.owner.nickname === p.nickname), trilhas: TRILHAS.filter((t) => t.owner.nickname === p.nickname) }
  }

  // cursos, trilhas e posts
  if (method === 'GET' && (m = pathname.match(/^\/courses\/by-slug\/[^/]+\/([^/]+)$/))) return courseDetail(m[1])
  if (method === 'GET' && /^\/courses\/[^/]+\/comments$/.test(pathname)) return COMMENTS
  if (method === 'GET' && /^\/(courses|posts)\/[^/]+\/(related|trilhas)$/.test(pathname)) return page([])
  if (method === 'GET' && /\/trilhas\/highlighted$/.test(pathname)) return []
  if (method === 'GET' && (m = pathname.match(/^\/trilhas\/by-slug\/[^/]+\/([^/]+)$/))) return trilhaDetail(m[1])
  if (method === 'GET' && (m = pathname.match(/^\/posts\/by-slug\/[^/]+\/([^/]+)$/))) return postDetail(m[1])
  if (method === 'GET' && /^\/posts\/[^/]+\/comments$/.test(pathname)) return COMMENTS.slice(0, 1)
  if (method === 'GET' && (m = pathname.match(/^\/lessons\/([^/]+)\/blocks$/))) return blocksOf(m[1])

  // minha área
  if (method === 'GET' && pathname === '/enrollments/me/last-accessed') return COURSE_BY_N(1)
  if (method === 'GET' && pathname === '/enrollments/me/in-progress') return COURSES.filter((c) => c.enrolledByMe)
  if (method === 'GET' && pathname === '/enrollments/me/completed') return []
  if (method === 'GET' && pathname === '/trilhas/me/following') return [TRILHAS[0]]
  if (method === 'GET' && pathname === '/trilhas/me/completed') return []
  if (method === 'GET' && pathname === '/library/folders') {
    return [
      { id: id(9001), name: 'Favoritos', itemCount: 4, isDefault: true, createdAt: '2026-06-01T12:00:00Z' },
      { id: id(9002), name: 'Para ler depois', itemCount: 2, isDefault: false, createdAt: '2026-07-01T12:00:00Z' },
      { id: id(9003), name: 'Carreira', itemCount: 3, isDefault: false, createdAt: '2026-08-01T12:00:00Z' },
    ]
  }
  if (method === 'GET' && pathname === '/library/overview') {
    const row = (c, status, percentage, ago) => ({ kind: 'course', course: c, trilha: null, status, percentage, lastInteraction: new Date(Date.now() - ago * 3600e3).toISOString() })
    return [
      row(COURSE_BY_N(1), 'IN_PROGRESS', 33, 3), row(COURSE_BY_N(4), 'IN_PROGRESS', 25, 26), row(COURSE_BY_N(2), 'COMPLETED', 100, 120),
      { kind: 'trilha', course: null, trilha: TRILHAS[0], status: 'IN_PROGRESS', percentage: 40, lastInteraction: new Date(Date.now() - 50 * 3600e3).toISOString() },
      row(COURSE_BY_N(7), 'NOT_STARTED', 0, 200),
    ]
  }
  if (method === 'GET' && pathname === '/messages/conversations') return CONVERSATIONS
  if (method === 'GET' && (m = pathname.match(/^\/messages\/with\/([^/]+)$/))) return page(m[1] === 'professor-demo' ? [...THREAD_WITH_PROF].reverse() : [])
  if (method === 'GET' && pathname === '/notifications') return page(NOTIFICATIONS)

  // exercícios de código
  if ((m = pathname.match(/^\/blocks\/([^/]+)\/exercise\/progress$/))) {
    const key = Object.keys(EX).find((k) => EX[k].block === m[1])
    return { blockId: m[1], passed: state.passed.includes(EX[key]?.lesson), failedSubmissions: 0, solutionAvailable: false, lastCode: state.lastCode[m[1]] ?? null }
  }
  if (method === 'POST' && /\/exercise\/run$/.test(pathname)) return state.nextRun
  if (method === 'POST' && /\/exercise\/submit$/.test(pathname)) return state.nextSubmit
  if ((m = pathname.match(/^\/blocks\/([^/]+)\/exercise\/spec$/))) return ownerSpec(m[1] === EX.go.block ? 'go' : 'py')
  if (method === 'POST' && /\/code-exercise\/validate$/.test(pathname)) return state.validate

  if (method !== 'GET') return {}
  if (/size=/.test(search)) return page([])
  return []
}

export { OWNER, STUDENT }

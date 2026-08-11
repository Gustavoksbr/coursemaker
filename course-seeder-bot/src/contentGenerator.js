import { groqChatJSON } from './groq.js'

// Mirrors the languages Shiki highlights on the frontend (frontend/src/lib/constants.js). Kept as
// its own small copy since this bot is a standalone package, not a workspace of the frontend.
export const CODE_LANGUAGES = [
  'javascript', 'typescript', 'jsx', 'tsx', 'java', 'kotlin', 'python', 'go',
  'rust', 'csharp', 'php', 'ruby', 'sql', 'html', 'css', 'json', 'yaml',
  'bash', 'dockerfile', 'markdown',
]

const HTML_RULES =
  'Use apenas tags HTML simples: <p>, <h3>, <strong>, <em>, <ul>, <ol>, <li>, <code>. ' +
  'Nunca inclua <html>, <head>, <body>, markdown (como ** ou #) ou blocos de codigo dentro do texto.'

function asNonEmptyString(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

/**
 * One Groq call per course: picks a topic and lays out the curriculum (module titles + lesson
 * titles). No block content yet -- that comes from generateModuleContent, one call per module, so
 * a single malformed response never costs the whole course.
 */
export async function generateCourseSkeleton(config, { modulesCount, lessonsPerModule }) {
  const system =
    'Voce cria curriculos de cursos tecnicos (programacao, dados, infraestrutura, design de produto ' +
    'digital, etc) para uma plataforma de ensino em portugues do Brasil. Responda SOMENTE com um ' +
    'objeto JSON valido, sem markdown, sem comentarios, no formato exato pedido pelo usuario.'

  const user = `Escolha um tema tecnico especifico e interessante (evite temas genericos como
"Introducao a Programacao"; prefira algo como "Construindo APIs REST com Node.js e Postgres" ou
"Testes automatizados em React com Testing Library"). Gere um curriculo com exatamente
${modulesCount} modulos, cada um com exatamente ${lessonsPerModule} titulos de aula.

Responda com este JSON exato:
{
  "name": "titulo do curso, ate 80 caracteres",
  "description": "1-2 frases resumindo o curso, texto puro, ate 280 caracteres",
  "landingDescription": "2-3 paragrafos em HTML simples apresentando o curso. ${HTML_RULES}",
  "categories": ["1 a 3 tags curtas, ex: Node.js, Backend, APIs"],
  "modules": [
    { "title": "titulo do modulo", "lessonTitles": ["titulo da aula 1", "..."] }
  ]
}`

  const raw = await groqChatJSON(config, { system, user, maxTokens: 2000, temperature: 1.0 })
  return sanitizeSkeleton(raw, { modulesCount, lessonsPerModule })
}

function sanitizeSkeleton(raw, { modulesCount, lessonsPerModule }) {
  const name = asNonEmptyString(raw?.name, 'Curso gerado automaticamente')
  const modules = asArray(raw?.modules)
    .slice(0, Math.max(modulesCount, 1) + 2)
    .map((module, index) => ({
      title: asNonEmptyString(module?.title, `Modulo ${index + 1}`),
      lessonTitles: asArray(module?.lessonTitles)
        .filter((title) => typeof title === 'string' && title.trim())
        .slice(0, Math.max(lessonsPerModule, 1) + 2),
    }))
    .filter((module) => module.lessonTitles.length > 0)

  if (modules.length === 0) {
    throw new Error('Groq nao retornou nenhum modulo valido para o curso')
  }

  return {
    name,
    description: asNonEmptyString(raw?.description, `Curso sobre ${name}.`),
    landingDescription: asNonEmptyString(raw?.landingDescription, `<p>${name}</p>`),
    categories: asArray(raw?.categories)
      .filter((tag) => typeof tag === 'string' && tag.trim())
      .slice(0, 3),
    modules,
  }
}

/**
 * One Groq call per module: given the lesson titles already decided by the skeleton, generates the
 * actual text/code blocks for each one. The titles we send are the titles we keep -- the model only
 * fills in content, so a reordered or renamed reply can never desync a lesson from its blocks.
 */
export async function generateModuleContent(config, { courseName, moduleTitle, lessonTitles, blocksMin, blocksMax }) {
  const system =
    'Voce escreve o conteudo didatico de aulas de um curso tecnico, em portugues do Brasil. ' +
    'Responda SOMENTE com um objeto JSON valido, sem markdown, no formato exato pedido.'

  const user = `Curso: "${courseName}". Modulo: "${moduleTitle}".
Escreva o conteudo de cada uma destas aulas, na mesma ordem: ${JSON.stringify(lessonTitles)}.

Cada aula deve ter entre ${blocksMin} e ${blocksMax} blocos, alternando texto explicativo e
exemplos de codigo reais e relevantes ao tema (nao use codigo generico tipo "foo/bar" sem sentido).
Cada bloco de texto: ${HTML_RULES}
Cada bloco de codigo: escolha "language" entre ${JSON.stringify(CODE_LANGUAGES)}.

Responda com este JSON exato, um item de "lessons" para cada titulo, na mesma ordem:
{
  "lessons": [
    {
      "blocks": [
        { "type": "text", "content": "<p>...</p>" },
        { "type": "code", "content": "codigo aqui", "language": "javascript" }
      ]
    }
  ]
}`

  const raw = await groqChatJSON(config, { system, user, maxTokens: 4000, temperature: 0.8 })
  return sanitizeModuleContent(raw, { lessonTitles, blocksMin, blocksMax })
}

function sanitizeModuleContent(raw, { lessonTitles, blocksMin, blocksMax }) {
  const lessonsContent = asArray(raw?.lessons)

  return lessonTitles.map((title, index) => {
    const blocks = asArray(lessonsContent[index]?.blocks)
      .map(sanitizeBlock)
      .filter(Boolean)
      .slice(0, Math.max(blocksMax, 1))

    if (blocks.length < blocksMin) {
      blocks.push({
        type: 'text',
        content: `<p>Conteudo desta aula: <strong>${title}</strong>.</p>`,
        language: null,
      })
    }

    return { title, blocks }
  })
}

function sanitizeBlock(block) {
  const type = block?.type === 'code' ? 'code' : block?.type === 'text' ? 'text' : null
  const content = asNonEmptyString(block?.content, null)
  if (!type || !content) return null

  if (type === 'text') return { type, content, language: null }

  const language = CODE_LANGUAGES.includes(block?.language) ? block.language : 'plaintext'
  return { type, content, language }
}

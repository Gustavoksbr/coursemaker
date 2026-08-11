// The bot leans on springdoc's /v3/api-docs as its contract with the backend: rather than trusting
// that the hardcoded paths below still exist, it checks them against the live spec before doing
// anything else. If the API shape changed, this fails fast with a clear message instead of the bot
// limping through half of a run and leaving orphaned accounts/courses behind.
const REQUIRED_OPERATIONS = [
  ['post', '/api/v1/auth/register'],
  ['patch', '/api/v1/users/{id}'],
  ['post', '/api/v1/courses'],
  ['get', '/api/v1/courses/{courseId}/modules'],
  ['post', '/api/v1/courses/{courseId}/modules'],
  ['delete', '/api/v1/modules/{id}'],
  ['post', '/api/v1/modules/{moduleId}/lessons'],
  ['post', '/api/v1/lessons/{lessonId}/blocks'],
  ['patch', '/api/v1/courses/{id}'],
]

export async function verifySwagger(apiBaseUrl) {
  const url = `${apiBaseUrl}/v3/api-docs`
  let response
  try {
    response = await fetch(url)
  } catch (cause) {
    throw new Error(`Nao foi possivel buscar o swagger em ${url}. O backend esta rodando?`, { cause })
  }
  if (!response.ok) {
    throw new Error(`GET ${url} respondeu ${response.status}`)
  }

  const spec = await response.json()
  const paths = spec.paths ?? {}

  const missing = REQUIRED_OPERATIONS.filter(
    ([method, path]) => !paths[path]?.[method],
  )
  if (missing.length > 0) {
    const list = missing.map(([method, path]) => `${method.toUpperCase()} ${path}`).join(', ')
    throw new Error(
      `O swagger em ${url} nao expoe mais estas operacoes que o bot depende: ${list}. ` +
        'A API do backend provavelmente mudou e este bot precisa ser atualizado.',
    )
  }

  console.log(
    `[swagger] ${spec.info?.title ?? 'API'} v${spec.info?.version ?? '?'} - ` +
      `${Object.keys(paths).length} rotas, todas as operacoes esperadas presentes.`,
  )
}

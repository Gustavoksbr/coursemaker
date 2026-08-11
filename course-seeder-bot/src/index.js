import { loadConfig } from './config.js'
import { createHttpClient } from './httpClient.js'
import { verifySwagger } from './swagger.js'
import { registerBotAccount, setupNickname } from './auth.js'
import { buildRandomCourses } from './courseBuilder.js'

async function main() {
  console.log('== Coursemaker course seeder bot ==')

  const config = loadConfig()
  await verifySwagger(config.apiBaseUrl)

  const http = createHttpClient(`${config.apiBaseUrl}/api/v1`)

  const { token, user, email } = await registerBotAccount(http, config)
  http.setToken(token)
  console.log(`[auth] conta criada: ${email}`)

  const nickname = await setupNickname(http, user, email)
  console.log(`[auth] nickname definido: ${nickname}`)

  const courses = await buildRandomCourses(http, config)

  console.log(`\nConcluido: ${courses.length} curso(s) criado(s) na conta ${email}.`)
}

main().catch((error) => {
  console.error('\nFalha na execucao do bot:')
  console.error(error.message)
  if (error.body) console.error(JSON.stringify(error.body, null, 2))
  process.exitCode = 1
})

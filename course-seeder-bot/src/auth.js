import { readCounter, writeCounter } from './accountCounter.js'

const MAX_ATTEMPTS = 200

/**
 * Registers a brand new account, never reuses one. The counter file just remembers where to
 * resume numbering; if an email is already taken (another run, another machine, manual testing)
 * it keeps bumping the number until one sticks, and persists whatever number actually worked.
 */
export async function registerBotAccount(http, config) {
  let counter = readCounter(1)

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const email = `${config.bot.emailPrefix}${counter}${config.bot.emailDomain}`
    try {
      const auth = await http.post(
        '/auth/register',
        { email, password: config.bot.password, name: config.bot.name },
        { auth: false },
      )
      writeCounter(counter + 1)
      return { token: auth.token, user: auth.user, email }
    } catch (error) {
      if (error.status === 409) {
        counter += 1
        continue
      }
      throw error
    }
  }

  throw new Error(`Nao foi possivel achar um email disponivel apos ${MAX_ATTEMPTS} tentativas`)
}

/** Every fresh account needs a nickname before it can own a course (see backend CourseService). */
export async function setupNickname(http, user, email) {
  if (!user.needsNickname && user.nickname) {
    return user.nickname
  }

  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-')

  for (let attempt = 0; attempt < 5; attempt++) {
    const nickname = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`
    try {
      const updated = await http.patch(`/users/${user.id}`, { nickname })
      return updated.nickname
    } catch (error) {
      if (error.status === 409) continue
      throw error
    }
  }

  throw new Error('Nao foi possivel definir um nickname para a conta do bot')
}

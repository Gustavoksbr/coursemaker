import 'dotenv/config'

function int(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) ? value : fallback
}

function bool(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  return raw.trim().toLowerCase() === 'true'
}

function required(name) {
  const value = process.env[name]
  if (!value || !value.trim()) {
    throw new Error(
      `Variavel de ambiente ${name} nao configurada. Copie .env.example para .env e preencha.`,
    )
  }
  return value.trim()
}

export function loadConfig() {
  return {
    groq: {
      apiKey: required('GROQ_API_KEY'),
      model: process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile',
    },
    apiBaseUrl: (process.env.API_BASE_URL?.trim() || 'http://localhost:8080').replace(/\/+$/, ''),
    bot: {
      emailPrefix: process.env.BOT_EMAIL_PREFIX?.trim() || 'testebot',
      emailDomain: process.env.BOT_EMAIL_DOMAIN?.trim() || '@email.com',
      password: process.env.BOT_PASSWORD?.trim() || 'SenhaForte123!',
      name: process.env.BOT_NAME?.trim() || 'Bot Coursemaker',
    },
    volume: {
      coursesMin: int('COURSES_MIN', 2),
      coursesMax: int('COURSES_MAX', 3),
      modulesMin: int('MODULES_MIN', 2),
      modulesMax: int('MODULES_MAX', 4),
      lessonsMin: int('LESSONS_MIN', 2),
      lessonsMax: int('LESSONS_MAX', 4),
      blocksMin: int('BLOCKS_MIN', 2),
      blocksMax: int('BLOCKS_MAX', 4),
    },
    publishCourses: bool('PUBLISH_COURSES', true),
  }
}

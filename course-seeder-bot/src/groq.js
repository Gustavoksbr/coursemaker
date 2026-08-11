const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MAX_RETRIES = 3

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * One Groq chat completion, forced into JSON mode. Content generation always asks for a specific
 * JSON shape (see contentGenerator.js), so a response that fails to parse is treated the same as
 * a network error: retry with backoff, then give up.
 */
export async function groqChatJSON(config, { system, user, maxTokens = 4000, temperature = 0.9 }) {
  let lastError

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(1000 * 2 ** attempt)

    try {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.groq.apiKey}`,
        },
        body: JSON.stringify({
          model: config.groq.model,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Groq respondeu ${response.status}: ${text.slice(0, 300)}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('Groq nao retornou conteudo na resposta')

      return JSON.parse(content)
    } catch (error) {
      lastError = error
      console.warn(`[groq] tentativa ${attempt + 1}/${MAX_RETRIES + 1} falhou: ${error.message}`)
    }
  }

  throw new Error(`Groq falhou apos ${MAX_RETRIES + 1} tentativas: ${lastError.message}`)
}

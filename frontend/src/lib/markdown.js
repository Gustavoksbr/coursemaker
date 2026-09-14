/**
 * Converte o Markdown que a IA devolve em HTML, para o assistente de chat (`ChatWidget`).
 *
 * Por que existe, ja que "e so texto": o Groq responde em Markdown (**negrito**, listas, blocos de
 * codigo), mas a bolha do chat so mostrava o texto cru com `whitespace-pre-wrap` - os asteriscos e
 * marcadores apareciam literalmente na tela em vez de virarem formatacao real.
 *
 * Escopo deliberadamente pequeno: so o subconjunto que o prompt do backend pede (ver
 * `AiChatService.systemPrompt`) - titulos, listas, negrito, italico, codigo e links. Nada de tabela
 * ou HTML embutido. Uma biblioteca completa de Markdown seria mais peso e mais superficie de ataque
 * do que este chat precisa.
 *
 * Seguranca: todo texto e escapado antes de qualquer transformacao, entao o unico HTML que sai
 * daqui sao as tags geradas por esta funcao - nem o modelo nem o usuario conseguem injetar marcacao.
 * Ainda assim, o resultado passa por DOMPurify no `ChatWidget` como segunda linha de defesa, no
 * mesmo padrao ja usado para o HTML do Tiptap em `BlockRenderer`.
 */
export function renderMarkdown(markdown) {
  if (!markdown) return ''

  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const html = []
  let paragraph = []

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    html.push(`<p>${paragraph.map((line) => renderInline(line)).join('<br>')}</p>`)
    paragraph = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Bloco de codigo: consome ate a cerca de fechamento (ou o fim do texto, se o modelo esquecer
    // de fechar).
    if (trimmed.startsWith('```')) {
      flushParagraph()
      const code = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i])
        i++
      }
      html.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`)
      continue
    }

    if (trimmed === '') {
      flushParagraph()
      continue
    }

    // Separador horizontal (--- ou ***)
    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      flushParagraph()
      html.push('<hr>')
      continue
    }

    // Titulo. So h3/h4 saem: a bolha e estreita e um h1 dentro dela fica desproporcional, entao
    // niveis 1-3 viram h3 e o resto h4.
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (heading) {
      flushParagraph()
      const tag = heading[1].length <= 3 ? 'h3' : 'h4'
      html.push(`<${tag}>${renderInline(heading[2])}</${tag}>`)
      continue
    }

    // Citacao
    const quote = /^>\s?(.*)$/.exec(trimmed)
    if (quote) {
      flushParagraph()
      const quoted = [quote[1]]
      while (i + 1 < lines.length && /^>\s?/.test(lines[i + 1].trim())) {
        quoted.push(lines[++i].trim().replace(/^>\s?/, ''))
      }
      html.push(`<blockquote>${quoted.map((q) => renderInline(q)).join('<br>')}</blockquote>`)
      continue
    }

    // Listas. O consumo e feito aqui dentro porque um item pode continuar na linha seguinte (texto
    // indentado, sem marcador).
    if (isBullet(trimmed) || isOrdered(trimmed)) {
      flushParagraph()
      const ordered = isOrdered(trimmed)
      const items = []

      while (i < lines.length) {
        const current = lines[i].trim()
        const isItem = ordered ? isOrdered(current) : isBullet(current)

        if (isItem) {
          items.push(current.replace(ordered ? /^\d+[.)]\s+/ : /^[-*+]\s+/, ''))
        } else if (current !== '' && items.length > 0 && /^\s{2,}/.test(lines[i])) {
          items[items.length - 1] += ' ' + current
        } else {
          break
        }
        i++
      }
      i-- // o for volta a incrementar

      const tag = ordered ? 'ol' : 'ul'
      const rendered = items.map((item) => `<li>${renderInline(item)}</li>`).join('')
      html.push(`<${tag}>${rendered}</${tag}>`)
      continue
    }

    paragraph.push(line)
  }

  flushParagraph()
  return html.join('')
}

function isBullet(line) {
  return /^[-*+]\s+\S/.test(line)
}

function isOrdered(line) {
  return /^\d+[.)]\s+\S/.test(line)
}

/**
 * Formatacao dentro de uma linha. A ordem importa: o texto e escapado primeiro, os trechos de
 * codigo sao guardados em marcadores para nao terem seus asteriscos interpretados, e so entao o
 * resto e convertido.
 */
function renderInline(text) {
  let out = escape(text)

  // O marcador pode usar '<' com seguranca: depois do escape acima, nenhum '<' do texto original
  // sobrevive (virou &lt;), entao um '<' so pode ter vindo daqui - nao ha como o conteudo da
  // resposta forjar um marcador.
  const codeSpans = []
  out = out.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(code)
    return `<CODE${codeSpans.length - 1}>`
  })

  // Links: so http(s) e caminhos internos. Qualquer outro esquema (javascript:, data:) fica como
  // texto puro, sem virar link.
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
    const safe = /^(https?:\/\/|\/)/i.test(url)
    return safe ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>` : match
  })

  out = out
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\s][^_]*)_/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')

  return out.replace(/<CODE(\d+)>/g, (_, index) => `<code>${codeSpans[Number(index)]}</code>`)
}

function escape(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

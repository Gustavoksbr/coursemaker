import { CODE_LANGUAGES } from './constants'

const THEME = 'github-dark-default'

/**
 * A Shiki highlighter carrying only the languages the editor offers.
 *
 * Shiki's default entry point bundles every grammar it ships (hundreds of chunks, plus a 600 kB
 * Oniguruma wasm). The fine-grained bundle below loads the handful of grammars we actually expose
 * and uses the JavaScript regex engine, which drops the wasm entirely. `forgiving` keeps a grammar
 * the JS engine cannot fully express from throwing — worst case a few tokens go unstyled.
 */
const LANGUAGE_LOADERS = {
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
  jsx: () => import('@shikijs/langs/jsx'),
  tsx: () => import('@shikijs/langs/tsx'),
  java: () => import('@shikijs/langs/java'),
  kotlin: () => import('@shikijs/langs/kotlin'),
  python: () => import('@shikijs/langs/python'),
  go: () => import('@shikijs/langs/go'),
  rust: () => import('@shikijs/langs/rust'),
  csharp: () => import('@shikijs/langs/csharp'),
  php: () => import('@shikijs/langs/php'),
  ruby: () => import('@shikijs/langs/ruby'),
  sql: () => import('@shikijs/langs/sql'),
  html: () => import('@shikijs/langs/html'),
  css: () => import('@shikijs/langs/css'),
  json: () => import('@shikijs/langs/json'),
  yaml: () => import('@shikijs/langs/yaml'),
  xml: () => import('@shikijs/langs/xml'),
  bash: () => import('@shikijs/langs/bash'),
  shell: () => import('@shikijs/langs/shellscript'),
  dockerfile: () => import('@shikijs/langs/docker'),
  markdown: () => import('@shikijs/langs/markdown'),
}

let highlighterPromise = null
const loadedLanguages = new Set()

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('@shikijs/themes/github-dark-default'),
    ]).then(([core, engine, theme]) =>
      core.createHighlighterCore({
        themes: [theme.default],
        langs: [],
        engine: engine.createJavaScriptRegexEngine({ forgiving: true }),
      }),
    )
  }
  return highlighterPromise
}

export function isSupportedLanguage(language) {
  return Boolean(language && LANGUAGE_LOADERS[language])
}

/**
 * Highlights `code`, loading the grammar on first use. Returns null when highlighting is not
 * possible, so the caller can fall back to plain text.
 */
export async function highlight(code, language) {
  const highlighter = await getHighlighter()

  const lang = isSupportedLanguage(language) ? language : null
  if (lang && !loadedLanguages.has(lang)) {
    const grammar = await LANGUAGE_LOADERS[lang]()
    await highlighter.loadLanguage(grammar.default)
    loadedLanguages.add(lang)
  }

  return highlighter.codeToHtml(code, { lang: lang ?? 'text', theme: THEME })
}

/** Languages the code-block editor offers, minus any without a loader. */
export const HIGHLIGHTABLE_LANGUAGES = CODE_LANGUAGES.filter(
  (language) => language === 'plaintext' || isSupportedLanguage(language),
)

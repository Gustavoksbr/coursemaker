/**
 * The wire values of the backend enums. They are lowercase on purpose: the Java enums serialize via
 * @JsonValue and the database CHECK constraints store the very same strings.
 */
export const VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
}

export const STATUS = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
}

export const BLOCK_TYPE = {
  TEXT: 'text',
  CODE: 'code',
  IMAGE: 'image',
  VIDEO: 'video',
}

export const ROLE = {
  USER: 'user',
  ADMIN: 'admin',
}

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'name', label: 'Ordem alfabetica' },
]

export const PAGE_SIZE = 12

/**
 * Character limits mirroring the backend's own `@Size` constraints (see the DTOs under
 * `backend/src/main/java/com/coursemaker/dto`). Keeping them here means every form fails the same
 * way the API would - a 400 never happens because someone forgot to update one side.
 *
 * PASSWORD is 72, not something larger: BCrypt only looks at the first 72 bytes of a password, so
 * a higher limit would silently accept characters that never actually take part in the hash.
 */
export const LIMITS = {
  EMAIL: 255,
  PASSWORD: 72,
  NAME: 255,
  NICKNAME: 30,
  TITLE: 255,
  SLUG: 255,
  DESCRIPTION: 5000,
  LANDING_DESCRIPTION: 50000,
  BIO: 5000,
  URL: 2000,
  COMMENT: 5000,
  BLOCK_CONTENT: 100_000,
  CATEGORY: 50,
  SEARCH_QUERY: 200,
  AUTHOR_FILTER: 30,
}

/** Languages offered by the code-block editor; Shiki bundles many more. */
export const CODE_LANGUAGES = [
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'java',
  'kotlin',
  'python',
  'go',
  'rust',
  'csharp',
  'php',
  'ruby',
  'sql',
  'html',
  'css',
  'json',
  'yaml',
  'xml',
  'bash',
  'shell',
  'dockerfile',
  'markdown',
  'plaintext',
]

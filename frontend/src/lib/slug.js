/**
 * Mirrors SlugGeneratorService on the backend so the create-course modal can preview the slug
 * without a round-trip. The server still owns the final value (it also resolves collisions).
 */
export function slugify(input) {
  if (!input) return ''
  return input
    .trim()
    .normalize('NFD') // splits "ç" into "c" + combining cedilla
    .replace(/[̀-ͯ]/g, '') // drop the combining marks, leaving plain ASCII
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200)
    .replace(/-+$/, '')
}

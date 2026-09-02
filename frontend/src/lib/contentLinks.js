/**
 * Builds the canonical link into a course/post/trilha.
 *
 * Area deliberately does NOT appear in these URLs: it is a filter dimension, not a navigation mode,
 * so a piece of content keeps the same address even if its owner moves it to another area. Every
 * card and content link goes through here, which is what makes that a single-file decision.
 */
export function courseHref(course) {
  return `/courses/${course.owner.nickname}/${course.slug}`
}

export function postHref(post) {
  return `/posts/${post.owner.nickname}/${post.slug}`
}

export function trilhaHref(trilha) {
  return `/trilhas/${trilha.owner.nickname}/${trilha.slug}`
}

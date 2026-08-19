/**
 * A QUESTION block's `content` is a JSON-encoded string (the block column is plain text end to
 * end, same as every other block type - there is no structured column for it). This is the only
 * place that knows that shape, so the editor and the renderer can never drift apart on it.
 */

export function makeAlternative(correct = false) {
  return { id: crypto.randomUUID(), text: '', correct, explanation: '' }
}

export function defaultQuestionContent() {
  return JSON.stringify({ alternatives: [makeAlternative(true), makeAlternative(false)] })
}

/** Never throws: malformed or legacy content just falls back to a fresh, empty question. */
export function parseQuestionContent(content) {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed?.alternatives) && parsed.alternatives.length > 0) {
      return { alternatives: parsed.alternatives }
    }
  } catch {
    // fall through to the default below
  }
  return { alternatives: [makeAlternative(true), makeAlternative(false)] }
}

export function stringifyQuestionContent(question) {
  return JSON.stringify(question)
}

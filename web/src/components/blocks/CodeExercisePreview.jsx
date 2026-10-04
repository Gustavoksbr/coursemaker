import { SquareTerminal } from 'lucide-react'
import { CodeBlock } from './CodeBlock'
import { EXERCISE_MODE, formatCall } from '@/lib/codeExercise'

/** The public face of an exercise, from either the creator's draft form or the stored block content. */
function viewOf(block) {
  const form = block.exercise
  if (form) {
    const isFunction = form.mode === EXERCISE_MODE.FUNCTION
    const visible = form.tests.filter((test) => test.visible)
    return {
      title: form.title,
      mode: form.mode,
      starterCode: form.starterCode,
      hiddenCount: form.tests.length - visible.length,
      examples: visible.map((test) =>
        isFunction
          ? { label: `${form.functionName}(${test.args.join(', ')})`, expected: test.expected }
          : { input: test.input, expected: test.expected },
      ),
    }
  }

  try {
    const content = JSON.parse(block.content ?? '{}')
    const isFunction = content.mode === EXERCISE_MODE.FUNCTION
    return {
      title: content.title,
      mode: content.mode,
      starterCode: content.starterCode ?? '',
      hiddenCount: content.hiddenCount ?? 0,
      examples: (content.examples ?? []).map((example) =>
        isFunction
          ? { label: formatCall(content.functionName, example.args), expected: JSON.stringify(example.expected) }
          : { input: example.input, expected: example.expected },
      ),
    }
  } catch {
    return null
  }
}

/**
 * Static, read-only rendering of a code exercise - what the editor's "Visualizar" shows. The
 * interactive version a student works in lives in `CodeExerciseBlock`.
 */
export function CodeExercisePreview({ block }) {
  const view = viewOf(block)
  if (!view) {
    return <p className="text-sm text-slate-500">Nao foi possivel exibir este exercicio.</p>
  }

  const isFunction = view.mode === EXERCISE_MODE.FUNCTION

  return (
    <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
      <header className="flex items-center gap-2">
        <SquareTerminal size={16} className="text-sky-400" />
        <h3 className="font-semibold text-slate-100">{view.title || 'Exercicio de codigo'}</h3>
        <span className="ml-auto font-mono text-xs text-slate-500">{block.language}</span>
      </header>

      {view.examples.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Exemplos</p>
          <ul className="space-y-1.5">
            {view.examples.map((example, index) =>
              isFunction ? (
                <li key={index} className="font-mono text-sm text-slate-300">
                  {example.label} <span className="text-slate-500">→</span> {example.expected}
                </li>
              ) : (
                <li key={index} className="grid gap-2 text-sm sm:grid-cols-2">
                  <pre className="rounded bg-slate-950 p-2 font-mono text-xs text-slate-300">{example.input || '(sem entrada)'}</pre>
                  <pre className="rounded bg-slate-950 p-2 font-mono text-xs text-slate-300">{example.expected}</pre>
                </li>
              ),
            )}
          </ul>
          {view.hiddenCount > 0 && (
            <p className="mt-1.5 text-xs text-slate-500">
              + {view.hiddenCount} {view.hiddenCount === 1 ? 'teste escondido' : 'testes escondidos'}
            </p>
          )}
        </div>
      )}

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Codigo inicial</p>
        <CodeBlock code={view.starterCode} language={block.language} />
      </div>
    </section>
  )
}

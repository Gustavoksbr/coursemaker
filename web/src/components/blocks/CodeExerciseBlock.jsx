import { useEffect, useRef, useState } from 'react'
import {
  CircleCheck,
  CircleX,
  ClipboardPaste,
  EyeOff,
  Lightbulb,
  PartyPopper,
  Play,
  Send,
  SquareTerminal,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import CodeEditor from './CodeEditor'
import { CodeExercisePreview } from './CodeExercisePreview'
import {
  getCodeExerciseProgress,
  getCodeExerciseSolution,
  runCodeExercise,
  submitCodeExercise,
} from '@/api/courses'
import { useToast } from '@/context/ToastContext'
import { errorMessage } from '@/lib/api'
import { EXERCISE_MODE, formatCall, LANGUAGE_LABELS, typedParam } from '@/lib/codeExercise'
import { cn } from '@/lib/cn'

function parseContent(block) {
  try {
    return JSON.parse(block.content ?? '{}')
  } catch {
    return null
  }
}

/** The text shown for a value that came back from a test: JSON in function mode, raw otherwise. */
function show(mode, value) {
  if (value === null || value === undefined) return mode === EXERCISE_MODE.FUNCTION ? 'null' : ''
  return mode === EXERCISE_MODE.FUNCTION ? JSON.stringify(value) : String(value)
}

/**
 * The exercise a student works in: editor, visible examples, "Executar exemplos" (visible tests
 * only, never counts), "Enviar solucao" (every test, counts, hidden ones reduced to a number) and
 * "Ver solucao" (always available - there is nothing to earn first).
 *
 * Falls back to the static preview when the viewer cannot run code (not signed in).
 * `onPassed(blockId)` fires the first time a submission passes everything, so the lesson view can
 * unlock "Proxima aula" without refetching the course.
 */
export function CodeExerciseBlock({ block, passed: passedFromCourse = false, onPassed, interactive = true }) {
  if (!interactive) return <CodeExercisePreview block={block} />
  return <InteractiveExercise block={block} passedFromCourse={passedFromCourse} onPassed={onPassed} />
}

function InteractiveExercise({ block, passedFromCourse, onPassed }) {
  const toast = useToast()
  const content = parseContent(block)

  const [code, setCode] = useState(content?.starterCode ?? '')
  const touched = useRef(false)
  const [progress, setProgress] = useState({ passed: passedFromCourse, failedSubmissions: 0 })
  const [busy, setBusy] = useState(null) // 'run' | 'submit' | 'solution'
  const [runResult, setRunResult] = useState(null)
  const [submitResult, setSubmitResult] = useState(null)
  const [solution, setSolution] = useState(null)

  // Restore where the student left off: last code, attempts, whether the solution is unlocked.
  useEffect(() => {
    let cancelled = false
    getCodeExerciseProgress(block.id)
      .then((saved) => {
        if (cancelled) return
        setProgress({ passed: saved.passed, failedSubmissions: saved.failedSubmissions })
        if (saved.lastCode && !touched.current) setCode(saved.lastCode)
      })
      .catch(() => {
        // Not fatal: the exercise still works from its starter code.
      })
    return () => {
      cancelled = true
    }
  }, [block.id])

  if (!content) {
    return <p className="text-sm text-slate-500">Nao foi possivel exibir este exercicio.</p>
  }

  const mode = content.mode
  const isFunction = mode === EXERCISE_MODE.FUNCTION
  const examples = content.examples ?? []
  const hiddenCount = content.hiddenCount ?? 0
  const paramTypes = content.paramTypes ?? []
  // Typed languages show typed parameters: soma(int a, int b), soma(a int, b int) in Go...
  const params = (content.params ?? [])
    .map((param, index) => (paramTypes[index] ? typedParam(block.language, paramTypes[index], param) : param))
    .join(', ')
  const done = progress.passed

  const changeCode = (value) => {
    touched.current = true
    setCode(value)
  }

  const run = async () => {
    setBusy('run')
    try {
      setRunResult(await runCodeExercise(block.id, code))
      setSubmitResult(null)
    } catch (error) {
      toast.error(errorMessage(error, 'Nao foi possivel executar agora.'))
    } finally {
      setBusy(null)
    }
  }

  const submit = async () => {
    setBusy('submit')
    try {
      const result = await submitCodeExercise(block.id, code)
      setSubmitResult(result)
      setRunResult(null)
      const wasPassed = progress.passed
      setProgress({ passed: result.exercisePassed, failedSubmissions: result.failedSubmissions })
      if (result.exercisePassed && !wasPassed) onPassed?.(block.id)
    } catch (error) {
      toast.error(errorMessage(error, 'Nao foi possivel enviar agora.'))
    } finally {
      setBusy(null)
    }
  }

  const revealSolution = async () => {
    setBusy('solution')
    try {
      const result = await getCodeExerciseSolution(block.id)
      setSolution(result.solutionCode)
    } catch (error) {
      toast.error(errorMessage(error, 'Nao foi possivel abrir a solucao.'))
    } finally {
      setBusy(null)
    }
  }

  const useSolution = () => {
    touched.current = true
    setCode(solution)
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/60 p-3 sm:space-y-4 sm:p-4" aria-label={content.title || 'Exercicio de codigo'}>
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
          <SquareTerminal size={18} />
        </span>
        <div className="order-3 w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
          <p className="break-words font-semibold text-slate-100 sm:truncate">{content.title || 'Exercicio de codigo'}</p>
          <p className="break-words text-xs text-slate-400">
            Exercicio de codigo ·{' '}
            {isFunction ? (
              <>
                implemente a funcao <code className="font-mono text-sky-300">{content.functionName}({params})</code>
              </>
            ) : (
              'escreva o programa completo (entrada pelo teclado, resposta na tela)'
            )}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs sm:ml-0">
          <span className="rounded-md bg-slate-700 px-2 py-1 font-medium text-slate-200">
            {LANGUAGE_LABELS[block.language] ?? block.language}
          </span>
          <span
            className={cn(
              'rounded-md px-2 py-1 font-medium',
              done ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-300',
            )}
          >
            {done ? 'Concluido' : 'Pendente'}
          </span>
        </div>
      </header>

      <CodeEditor value={code} onChange={changeCode} language={block.language} minHeight="180px" />

      {examples.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Exemplos</p>
          <ul className="space-y-1.5">
            {examples.map((example, index) =>
              isFunction ? (
                <li key={index} className="break-all font-mono text-xs text-slate-300 sm:text-sm">
                  {formatCall(content.functionName, example.args)} <span className="text-slate-500">→</span>{' '}
                  {JSON.stringify(example.expected)}
                </li>
              ) : (
                <li key={index} className="grid gap-2 sm:grid-cols-2">
                  <LabeledPre label="Entrada" text={example.input || '(sem entrada)'} />
                  <LabeledPre label="Saida esperada" text={example.expected} />
                </li>
              ),
            )}
          </ul>
          {hiddenCount > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <EyeOff size={13} /> Mais {hiddenCount} {hiddenCount === 1 ? 'teste escondido' : 'testes escondidos'},
              conferidos so quando voce envia.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button className="w-full sm:w-auto" variant="secondary" onClick={run} loading={busy === 'run'} disabled={busy !== null || !code.trim()}>
          <Play size={15} /> Executar exemplos
        </Button>
        <Button className="w-full sm:w-auto" onClick={submit} loading={busy === 'submit'} disabled={busy !== null || !code.trim()}>
          <Send size={15} /> Enviar solucao
        </Button>

        <div className="text-xs sm:ml-auto">
          <Button variant="ghost" size="sm" onClick={revealSolution} loading={busy === 'solution'} disabled={busy !== null}>
            <Lightbulb size={14} /> Ver solucao
          </Button>
        </div>
      </div>

      {runResult && <RunPanel result={runResult} mode={mode} functionName={content.functionName} />}
      {submitResult && <SubmitPanel result={submitResult} mode={mode} functionName={content.functionName} />}

      {solution !== null && (
        <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-300" />
            <p className="text-sm font-semibold text-slate-100">Solucao do autor</p>
            <p className="text-xs text-slate-400">uma das solucoes possiveis</p>
          </div>
          <CodeEditor value={solution} onChange={() => {}} language={block.language} minHeight="90px" readOnly />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={useSolution}>
              <ClipboardPaste size={14} /> Usar esta solucao
            </Button>
            <p className="text-xs text-slate-400">
              Substitui o seu codigo no editor. Para concluir, voce ainda precisa clicar em{' '}
              <strong className="text-slate-200">Enviar solucao</strong>.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

function LabeledPre({ label, text }) {
  return (
    <div>
      <p className="mb-0.5 text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <pre className="overflow-x-auto rounded bg-slate-950 p-2 font-mono text-xs text-slate-300">{text}</pre>
    </div>
  )
}

/** One visible test's line in a result: icon, what was run, and what happened. */
function OutcomeRow({ outcome, mode, functionName }) {
  const isFunction = mode === EXERCISE_MODE.FUNCTION
  const label = isFunction ? formatCall(functionName, outcome.args ?? []) : null

  return (
    <li className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        {outcome.passed ? (
          <CircleCheck size={15} className="shrink-0 translate-y-0.5 text-green-400" />
        ) : (
          <CircleX size={15} className="shrink-0 translate-y-0.5 text-red-400" />
        )}
        {isFunction ? (
          <>
            <span className="break-all font-mono text-slate-200">{label}</span>
            <span className="text-slate-400">
              {outcome.error ? (
                <span className="text-red-300">{outcome.error}</span>
              ) : outcome.passed ? (
                <>
                  retornou <code className="break-all font-mono text-slate-200">{show(mode, outcome.actual)}</code>
                </>
              ) : (
                <>
                  esperado <code className="break-all font-mono text-slate-200">{show(mode, outcome.expected)}</code>, recebido{' '}
                  <code className="break-all font-mono text-red-300">{show(mode, outcome.actual)}</code>
                </>
              )}
            </span>
          </>
        ) : (
          <span className="text-slate-300">{outcome.passed ? 'Passou' : 'Nao passou'}</span>
        )}
      </div>

      {!isFunction && !outcome.passed && (
        <div className="grid gap-2 pl-6 sm:grid-cols-3">
          <LabeledPre label="Entrada" text={outcome.input || '(sem entrada)'} />
          <LabeledPre label="Esperado" text={show(mode, outcome.expected)} />
          <LabeledPre label="Recebido" text={outcome.error || show(mode, outcome.actual) || '(nada)'} />
        </div>
      )}
    </li>
  )
}

function Diagnostics({ compileError, stderr, timedOut }) {
  return (
    <>
      {compileError && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-300">Erro de compilacao</p>
          <pre className="max-h-60 overflow-auto rounded bg-slate-950 p-2 font-mono text-xs text-red-200">{compileError}</pre>
        </div>
      )}
      {!compileError && stderr && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-300">Erro</p>
          <pre className="max-h-60 overflow-auto rounded bg-slate-950 p-2 font-mono text-xs text-red-200">{stderr}</pre>
        </div>
      )}
      {timedOut && (
        <p className="text-sm text-amber-300">O programa passou do tempo limite. Confira se nao ha um laco infinito.</p>
      )}
    </>
  )
}

function RunPanel({ result, mode, functionName }) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-100">Resultado dos exemplos</p>
        <p className="text-xs text-slate-500">executar nao conta como envio</p>
      </div>
      <Diagnostics compileError={result.compileError} stderr={result.stderr} timedOut={result.timedOut} />
      {result.tests.length > 0 && !result.compileError && (
        <ul className="space-y-2">
          {result.tests.map((outcome) => (
            <OutcomeRow key={outcome.index} outcome={outcome} mode={mode} functionName={functionName} />
          ))}
        </ul>
      )}
      {result.output && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Saida (seus prints)</p>
          <pre className="max-h-48 overflow-auto rounded bg-slate-950 p-2 font-mono text-xs text-slate-300">{result.output}</pre>
        </div>
      )}
    </div>
  )
}

function SubmitPanel({ result, mode, functionName }) {
  const visiblePassed = result.visible.filter((outcome) => outcome.passed).length

  if (result.allPassed) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
        <PartyPopper size={18} />
        <span className="font-medium">
          Todos os {result.total} testes passaram. Exercicio concluido!
        </span>
        <span className="text-xs text-green-400/80">
          Exemplos {visiblePassed}/{result.visible.length}
          {result.hiddenTotal > 0 && ` · Escondidos ${result.hiddenPassed}/${result.hiddenTotal}`}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <CircleX size={18} className="text-red-400" />
        <span className="text-sm font-semibold text-slate-100">
          {result.passedCount} de {result.total} testes passaram
        </span>
        {!result.exercisePassed && (
          <span className="rounded-md bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
            {result.failedSubmissions}o envio sem sucesso
          </span>
        )}
      </div>

      <Diagnostics compileError={result.compileError} stderr={result.stderr} timedOut={result.timedOut} />

      {result.visible.length > 0 && !result.compileError && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Exemplos · {visiblePassed}/{result.visible.length}
          </p>
          <ul className="space-y-2">
            {result.visible.map((outcome) => (
              <OutcomeRow key={outcome.index} outcome={outcome} mode={mode} functionName={functionName} />
            ))}
          </ul>
        </div>
      )}

      {result.hiddenTotal > 0 && !result.compileError && (
        <p className="flex items-center gap-1.5 text-sm text-slate-300">
          <EyeOff size={14} className="text-slate-500" />
          Testes escondidos · {result.hiddenPassed}/{result.hiddenTotal} passaram
          <span className="text-xs text-slate-500">(as entradas nao sao reveladas)</span>
        </p>
      )}

      {result.hiddenTotal > 0 && (
        <p className="text-xs text-slate-400">
          Dica: os escondidos cobrem casos de borda, como negativos, zero e valores vazios.
        </p>
      )}
    </div>
  )
}

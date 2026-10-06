import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CircleCheck,
  CircleX,
  FlaskConical,
  Lock,
  Plus,
  SquareFunction,
  Terminal,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Feedback'
import CodeEditor from './CodeEditor'
import { getCodeExerciseLanguages, getCodeExerciseSpec, validateCodeExercise } from '@/api/courses'
import { errorMessage } from '@/lib/api'
import { isTempId } from '@/lib/draftCollection'
import {
  defaultStarter,
  describeFirstFailure,
  emptyExercise,
  emptyTest,
  EXERCISE_MODE,
  exerciseFromServer,
  exerciseProblems,
  exerciseToPayload,
  coerceType,
  FALLBACK_LANGUAGES,
  isTypedLanguage,
  LANGUAGE_LABELS,
  MAX_PARAMS,
  MAX_TESTS,
  nativeType,
  testCounts,
  typeOptions,
} from '@/lib/codeExercise'
import { cn } from '@/lib/cn'

const MODES = [
  {
    value: EXERCISE_MODE.FUNCTION,
    icon: SquareFunction,
    title: 'Funcao com testes',
    text: 'O aluno escreve so uma funcao. Cada teste chama a funcao com argumentos e confere o retorno. Estilo LeetCode.',
  },
  {
    value: EXERCISE_MODE.OUTPUT,
    icon: Terminal,
    title: 'Saida do programa',
    text: 'O aluno escreve o programa inteiro. Cada teste da uma entrada (teclado) e confere o que foi impresso. Funciona em qualquer linguagem.',
  },
]

/**
 * Authoring form of a CODE_EXERCISE block. Like every block editor it is always live: each change
 * goes straight into the parent draft (`onChange({ exercise, language })`) and only reaches the
 * server when the page's own "Salvar alteracoes" flushes it.
 *
 * What is shown here (hidden tests, reference solution) never reaches students: for an existing
 * block it is fetched on demand from the owner-only spec endpoint, not from the block list.
 *
 * `onCheck` reports the outcome of "Testar solucao" up to the draft so the page can refuse to save
 * an exercise whose own solution fails - `null` means "not tested (any more)".
 */
export function CodeExerciseEditor({ block, courseId, onChange, onCheck }) {
  const existing = !isTempId(block.id)
  const [loaded, setLoaded] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [check, setCheck] = useState(null)

  const form = block.exercise ?? loaded

  const { data: languagesFromApi } = useQuery({
    queryKey: ['code-exercise-languages'],
    queryFn: getCodeExerciseLanguages,
    staleTime: Infinity,
  })
  const languages = languagesFromApi ?? FALLBACK_LANGUAGES

  useEffect(() => {
    if (!existing || block.exercise || loaded) return undefined
    let cancelled = false
    getCodeExerciseSpec(block.id)
      .then((owner) => {
        if (!cancelled) setLoaded(exerciseFromServer(owner))
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error, 'Nao foi possivel abrir este exercicio.'))
      })
    return () => {
      cancelled = true
    }
  }, [existing, block.id, block.exercise, loaded])

  if (loadError) {
    return <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{loadError}</p>
  }
  if (!form) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  const counts = testCounts(form.tests)
  const isFunction = form.mode === EXERCISE_MODE.FUNCTION
  const maxTests = MAX_TESTS[form.mode]
  const modeLanguages = languages[form.mode] ?? FALLBACK_LANGUAGES[form.mode]

  /** Applies a change, keeps the starter code in step while the creator has not touched it, and drops a stale check. */
  const update = (changes) => {
    let next = { ...form, ...changes }
    const untouched =
      form.starterCode ===
      defaultStarter(form.mode, form.language, form.functionName, form.params, form.paramTypes, form.returnType)
    if (untouched && !('starterCode' in changes)) {
      next = {
        ...next,
        starterCode: defaultStarter(next.mode, next.language, next.functionName, next.params, next.paramTypes, next.returnType),
      }
    }
    onChange({ exercise: next, language: next.language })
    if (check) {
      setCheck(null)
      onCheck?.(null)
    }
  }

  const changeMode = (mode) => {
    if (mode === form.mode) return
    const hasWork = form.solutionCode.trim() !== '' || form.tests.some((test) => test.expected.trim() !== '')
    if (hasWork && !window.confirm('Trocar o modo de correcao descarta os testes e a solucao deste exercicio. Continuar?')) {
      return
    }
    const language = languages[mode]?.includes(form.language) ? form.language : (languages[mode] ?? FALLBACK_LANGUAGES[mode])[0]
    const fresh = emptyExercise(mode, language)
    update({ ...fresh, title: form.title })
  }

  // Typed languages give every parameter (and the return value) a type; the dynamic ones drop them.
  // Moving between typed languages keeps each type when the new language accepts it (C has no arrays).
  const changeLanguage = (language) => {
    const typed = isFunction && isTypedLanguage(language)
    update({
      language,
      paramTypes: typed ? form.params.map((_, i) => coerceType(language, form.paramTypes[i] ?? 'int')) : [],
      returnType: typed ? coerceType(language, form.returnType || 'int') : '',
    })
  }

  // ---- parameters (function mode): every test keeps one argument cell per parameter
  const typed = isFunction && isTypedLanguage(form.language)
  const typeChoices = typeOptions(form.language)

  const renameParam = (index, name) =>
    update({ params: form.params.map((param, i) => (i === index ? name : param)) })

  const changeParamType = (index, type) =>
    update({ paramTypes: form.paramTypes.map((current, i) => (i === index ? type : current)) })

  const addParam = () => {
    if (form.params.length >= MAX_PARAMS) return
    update({
      params: [...form.params, `p${form.params.length + 1}`],
      paramTypes: typed ? [...form.paramTypes, 'int'] : form.paramTypes,
      tests: form.tests.map((test) => ({ ...test, args: [...test.args, ''] })),
    })
  }

  const removeParam = (index) =>
    update({
      params: form.params.filter((_, i) => i !== index),
      paramTypes: form.paramTypes.filter((_, i) => i !== index),
      tests: form.tests.map((test) => ({ ...test, args: test.args.filter((_, i) => i !== index) })),
    })

  // ---- tests
  const updateTest = (index, changes) =>
    update({ tests: form.tests.map((test, i) => (i === index ? { ...test, ...changes } : test)) })

  const updateArg = (testIndex, argIndex, value) =>
    updateTest(testIndex, { args: form.tests[testIndex].args.map((arg, i) => (i === argIndex ? value : arg)) })

  const addTest = () => {
    if (form.tests.length >= maxTests) return
    update({ tests: [...form.tests, emptyTest(form.mode, form.params.length)] })
  }

  const removeTest = (index) => update({ tests: form.tests.filter((_, i) => i !== index) })

  // ---- "Testar solucao"
  const problems = exerciseProblems(form)

  const runCheck = async () => {
    if (problems.length > 0) {
      setCheck({ status: 'invalid' })
      return
    }
    setCheck({ status: 'running' })
    onCheck?.(null)
    try {
      const validation = await validateCodeExercise(courseId, {
        language: form.language,
        exercise: exerciseToPayload(form),
      })
      if (validation.valid) {
        setCheck({ status: 'ok', validation })
        onCheck?.({ ok: true })
      } else {
        const failure = describeFirstFailure(form, validation)
        setCheck({ status: 'fail', validation, failure })
        const title = form.title.trim() ? `"${form.title.trim()}"` : 'sem titulo'
        onCheck?.({
          ok: false,
          message: `Exercicio ${title}: a solucao de referencia falha${failure.index != null ? ` no teste ${failure.index + 1}` : ''}.`,
        })
      }
    } catch (error) {
      setCheck({ status: 'error', message: errorMessage(error, 'Nao foi possivel testar a solucao agora.') })
    }
  }

  const useActualAsExpected = (failure) => {
    updateTest(failure.index, { expected: failure.fixWith })
  }

  const id = block.id

  return (
    <div className="space-y-5">
      <Field
        label="Titulo do exercicio"
        htmlFor={`exercise-title-${id}`}
        hint='Aparece no cabecalho do bloco e na aba "Atividades" do aluno.'
        value={form.title}
        maxLength={100}
      >
        <Input
          id={`exercise-title-${id}`}
          maxLength={100}
          value={form.title}
          onChange={(event) => update({ title: event.target.value })}
          placeholder="Ex.: Soma de dois numeros"
        />
      </Field>

      <div>
        <span className="label">Como o codigo e corrigido</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map(({ value, icon: Icon, title, text }) => {
            const active = form.mode === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => changeMode(value)}
                aria-pressed={active}
                className={cn(
                  'rounded-lg border p-3 text-left transition-colors',
                  active
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-slate-700 bg-slate-900/40 hover:border-slate-500',
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <Icon size={15} /> {title}
                </span>
                <span className="mt-1 block text-xs text-slate-400">{text}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Linguagem"
          htmlFor={`exercise-language-${id}`}
          hint={isFunction ? 'C e C++ por enquanto so no modo "Saida do programa".' : undefined}
        >
          <Select
            id={`exercise-language-${id}`}
            value={form.language}
            onChange={(event) => changeLanguage(event.target.value)}
          >
            {modeLanguages.map((language) => (
              <option key={language} value={language}>
                {LANGUAGE_LABELS[language] ?? language}
              </option>
            ))}
          </Select>
        </Field>

        {isFunction && (
          <Field label="Nome da funcao" htmlFor={`exercise-function-${id}`} hint="E o nome que os testes vao chamar.">
            <Input
              id={`exercise-function-${id}`}
              maxLength={60}
              value={form.functionName}
              onChange={(event) => update({ functionName: event.target.value })}
              className="font-mono"
              spellCheck={false}
            />
          </Field>
        )}

        {typed && (
          <Field
            label="Tipo de retorno"
            htmlFor={`exercise-return-${id}`}
            hint={form.language === 'java' ? 'Java e tipado: o aluno escreve so o metodo static, sem class.' : 'Esta linguagem e tipada: cada parametro tem um tipo, na grafia da linguagem.'}
          >
            <Select
              id={`exercise-return-${id}`}
              value={form.returnType}
              onChange={(event) => update({ returnType: event.target.value })}
              className="font-mono"
            >
              {typeChoices.map((type) => (
                <option key={type} value={type}>
                  {nativeType(form.language, type)}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {isFunction && (
        <div>
          <span className="label">Parametros</span>
          <div className="flex flex-wrap items-center gap-2">
            {form.params.map((param, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-900 pl-2 pr-1 font-mono text-sm"
              >
                {typed && (
                  <select
                    aria-label={`Tipo do parametro ${param}`}
                    value={form.paramTypes[index] ?? 'int'}
                    onChange={(event) => changeParamType(index, event.target.value)}
                    className="cursor-pointer bg-transparent py-1 text-sky-300 outline-none"
                  >
                    {typeChoices.map((type) => (
                      <option key={type} value={type} className="bg-slate-900">
                        {nativeType(form.language, type)}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  aria-label={`Parametro ${index + 1}`}
                  value={param}
                  maxLength={60}
                  onChange={(event) => renameParam(index, event.target.value)}
                  style={{ width: `${Math.max(param.length, 2) + 1}ch` }}
                  className="bg-transparent py-1 text-slate-100 outline-none"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => removeParam(index)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-red-400"
                  aria-label={`Remover parametro ${param}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={addParam}
              disabled={form.params.length >= MAX_PARAMS}
              className="btn-ghost border border-dashed border-slate-600 px-2 py-1 text-xs disabled:opacity-50"
            >
              <Plus size={12} /> parametro
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Cada teste ganha um campo por parametro, entao uma lista nunca se confunde com varios argumentos: em{' '}
            <code className="font-mono">maior(lista)</code>, o campo <code className="font-mono">lista</code> recebe{' '}
            <code className="font-mono">[3, 9, 2]</code>.
          </p>
        </div>
      )}

      <div>
        <span className="label">Codigo inicial</span>
        <CodeEditor
          value={form.starterCode}
          onChange={(value) => update({ starterCode: value })}
          language={form.language}
          minHeight="110px"
        />
        <p className="mt-1 text-xs text-slate-500">O aluno comeca com este codigo no editor.</p>
      </div>

      <div>
        <span className="label flex items-center gap-1.5">
          <Lock size={13} /> Solucao de referencia <span className="font-normal text-slate-500">(obrigatoria)</span>
        </span>
        <CodeEditor
          value={form.solutionCode}
          onChange={(value) => update({ solutionCode: value })}
          language={form.language}
          minHeight="110px"
        />
        <p className="mt-1 text-xs text-slate-500">
          Nunca e mostrada ao aluno, a nao ser depois de 2 envios sem sucesso. Tambem e rodada contra todos os
          testes ao salvar: um exercicio so e salvo se a sua propria solucao passa.
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="label mb-0">Testes</span>
          <span className="text-xs text-slate-500">
            {counts.visible} visiveis · {counts.hidden} escondidos
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-8 px-2 py-2">#</th>
                <th className="px-2 py-2">{isFunction ? 'Chamada' : 'Entrada (teclado)'}</th>
                <th className="px-2 py-2">{isFunction ? 'Retorno esperado' : 'Saida esperada'}</th>
                <th className="w-16 px-2 py-2 text-center">Visivel</th>
                <th className="w-8 px-1 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {form.tests.map((test, index) => {
                const failed = check?.status === 'fail' && check.failure?.index === index
                return (
                  <tr key={test.key} className={cn('align-top', failed && 'bg-red-500/5')}>
                    <td className="px-2 py-2 text-xs text-slate-500">{index + 1}</td>
                    <td className="px-2 py-2">
                      {isFunction ? (
                        <div className="flex flex-wrap items-center gap-1 font-mono text-[13px]">
                          <span className="text-sky-300">{form.functionName || '...'}(</span>
                          {test.args.map((arg, argIndex) => (
                            <span key={argIndex} className="inline-flex items-center gap-1">
                              {argIndex > 0 && <span className="text-slate-500">,</span>}
                              <input
                                aria-label={`Teste ${index + 1}, ${form.params[argIndex] ?? 'argumento'}`}
                                title={form.params[argIndex]}
                                placeholder={form.params[argIndex]}
                                value={arg}
                                onChange={(event) => updateArg(index, argIndex, event.target.value)}
                                style={{ width: `${Math.max(arg.length, (form.params[argIndex] ?? '').length, 4) + 2}ch` }}
                                className="rounded border border-slate-600 bg-slate-900 px-1.5 py-1 text-slate-100 outline-none focus:border-brand-500"
                                spellCheck={false}
                              />
                            </span>
                          ))}
                          <span className="text-sky-300">)</span>
                        </div>
                      ) : (
                        <textarea
                          aria-label={`Teste ${index + 1}, entrada`}
                          rows={2}
                          value={test.input}
                          onChange={(event) => updateTest(index, { input: event.target.value })}
                          className="input resize-y font-mono text-[13px]"
                          placeholder="(vazio)"
                          spellCheck={false}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {isFunction ? (
                        <input
                          aria-label={`Teste ${index + 1}, retorno esperado`}
                          value={test.expected}
                          onChange={(event) => updateTest(index, { expected: event.target.value })}
                          className="w-full min-w-[6rem] rounded border border-slate-600 bg-slate-900 px-1.5 py-1 font-mono text-[13px] text-slate-100 outline-none focus:border-brand-500"
                          spellCheck={false}
                        />
                      ) : (
                        <textarea
                          aria-label={`Teste ${index + 1}, saida esperada`}
                          rows={2}
                          value={test.expected}
                          onChange={(event) => updateTest(index, { expected: event.target.value })}
                          className="input resize-y font-mono text-[13px]"
                          spellCheck={false}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        aria-label={`Teste ${index + 1} visivel para o aluno`}
                        checked={test.visible}
                        onChange={(event) => updateTest(index, { visible: event.target.checked })}
                        className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-900 text-brand-500 focus:ring-brand-500"
                      />
                    </td>
                    <td className="px-1 py-2">
                      <button
                        type="button"
                        onClick={() => removeTest(index)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-red-400"
                        aria-label={`Remover teste ${index + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={addTest}
          disabled={form.tests.length >= maxTests}
          className="btn-ghost mt-2 border border-slate-700 text-xs disabled:opacity-50"
        >
          <Plus size={14} /> Adicionar teste
        </button>
        <p className="mt-1 text-xs text-slate-500">
          Visiveis aparecem como exemplos e o aluno pode executa-los quantas vezes quiser. Escondidos so rodam quando
          ele envia e nunca tem a entrada revelada: use-os para os casos de borda (negativos, zero, vazio...). Limite
          de {maxTests} testes neste modo.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={runCheck}
            loading={check?.status === 'running'}
          >
            <FlaskConical size={14} /> Testar solucao
          </Button>
          <CheckSummary check={check} total={form.tests.length} problems={problems} />
        </div>

        {check?.status === 'invalid' && (
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-300">
            {problems.map((problem) => (
              <li key={problem}>{problem.charAt(0).toUpperCase() + problem.slice(1)}.</li>
            ))}
          </ul>
        )}

        {check?.status === 'fail' && (
          <div className="space-y-2 text-sm">
            <p className="text-slate-200">{check.failure.sentence}</p>
            {check.failure.detail && (
              <pre className="max-h-48 overflow-auto rounded bg-slate-950 p-2 font-mono text-xs text-slate-300">
                {check.failure.detail}
              </pre>
            )}
            <p className="text-xs text-slate-400">
              Ou o valor esperado esta errado, ou a solucao esta. Corrija um dos dois: sem isso o exercicio nao
              pode ser salvo.
            </p>
            {check.failure.fixWith != null && check.failure.fixWith !== '' && (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" className="border border-slate-600" onClick={() => useActualAsExpected(check.failure)}>
                  <WandSparkles size={14} /> Usar{' '}
                  <code className="font-mono">{check.failure.fixWith.length > 24 ? `${check.failure.fixWith.slice(0, 24)}...` : check.failure.fixWith}</code>{' '}
                  como esperado
                </Button>
                <span className="text-xs text-slate-500">(so se a solucao estiver certa)</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CheckSummary({ check, total, problems }) {
  if (!check) {
    return (
      <span className="text-xs text-slate-500">
        Roda a solucao de referencia contra os {total} testes, sem salvar.
      </span>
    )
  }
  switch (check.status) {
    case 'running':
      return <span className="text-xs text-slate-400">Executando...</span>
    case 'ok':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
          <CircleCheck size={14} /> A solucao passou nos {total} testes.
        </span>
      )
    case 'fail':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
          <CircleX size={14} /> A solucao falhou em {total - check.validation.passedCount} de {total} testes.
        </span>
      )
    case 'invalid':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300">
          <CircleX size={14} /> Ainda falta preencher {problems.length} coisa(s).
        </span>
      )
    default:
      return <span className="text-xs text-red-400">{check.message}</span>
  }
}

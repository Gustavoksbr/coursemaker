/**
 * Form model of a code exercise (CODE_EXERCISE block) on the creator's side.
 *
 * The editor works on TEXT: each test cell holds what the creator typed (`2`, `[3, 9, 2]`, `"abc"`),
 * because half-typed JSON has to survive between keystrokes. `exerciseToPayload` turns the form
 * into what the API expects (parsed values); `exerciseFromServer` goes the other way when an
 * existing exercise is opened for editing; `exerciseProblems` lists what is still wrong with a form
 * so the page can refuse to save it (the server checks everything again).
 */

export const EXERCISE_MODE = {
  FUNCTION: 'function',
  OUTPUT: 'output',
}

/** Mirrors CodeExerciseService on the backend. */
export const MAX_TESTS = { function: 100, output: 20 }
export const MAX_PARAMS = 10
export const MAX_VALUE_CHARS = 10_000

/** Languages per mode when the API has not answered yet (the API's list wins once it does). */
export const FALLBACK_LANGUAGES = {
  function: ['javascript', 'python', 'java'],
  output: ['javascript', 'python', 'java', 'c', 'cpp'],
}

export const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

let keyCounter = 0
/** Stable React key for a test row (rows have no id until the server stores them). */
function nextKey() {
  keyCounter += 1
  return `t${keyCounter}`
}

// ---------------------------------------------------------------- java types

/**
 * Java is typed, so a function-mode exercise in Java declares a type per parameter and for the
 * return value, from this closed set (the gateway builds Java literals from it; the backend checks
 * the same list). Everything else - how a test's JSON is read - stays the same.
 */
export const JAVA_TYPES = [
  'int',
  'long',
  'double',
  'boolean',
  'String',
  'int[]',
  'long[]',
  'double[]',
  'boolean[]',
  'String[]',
  'List<Integer>',
  'List<Long>',
  'List<Double>',
  'List<Boolean>',
  'List<String>',
]

const BOXED_TO_SCALAR = { Integer: 'int', Long: 'long', Double: 'double', Boolean: 'boolean', String: 'String' }
const SCALARS = ['int', 'long', 'double', 'boolean', 'String']

/** `int[]` / `List<Integer>` -> `int`; null when the type is not in the set. */
export function javaScalarOf(type) {
  if (SCALARS.includes(type)) return type
  if (type.endsWith('[]') && SCALARS.includes(type.slice(0, -2))) return type.slice(0, -2)
  const list = /^List<([A-Za-z]+)>$/.exec(type)
  return list ? (BOXED_TO_SCALAR[list[1]] ?? null) : null
}

function isJavaCollection(type) {
  return type.endsWith('[]') || type.startsWith('List<')
}

function javaScalarProblem(scalar, value) {
  if (value === null) return scalar === 'String' ? null : 'null so vale para String, array e lista'
  switch (scalar) {
    case 'boolean':
      return typeof value === 'boolean' ? null : 'esperado true ou false'
    case 'String':
      return typeof value === 'string' ? null : 'esperado um texto entre aspas'
    case 'int':
      if (!Number.isInteger(value)) return 'esperado um numero inteiro'
      return value >= -2147483648 && value <= 2147483647 ? null : 'fora do intervalo de int'
    case 'long':
      return Number.isInteger(value) ? null : 'esperado um numero inteiro'
    default:
      return typeof value === 'number' ? null : 'esperado um numero'
  }
}

/** Why `value` (already parsed JSON) does not fit the Java `type`, or null when it does. */
export function javaValueProblem(type, value) {
  const scalar = javaScalarOf(type)
  if (!scalar) return `tipo ${type} nao suportado`
  if (!isJavaCollection(type)) return javaScalarProblem(scalar, value)
  if (value === null) return null
  if (!Array.isArray(value)) return 'esperado uma lista [..]'
  for (let i = 0; i < value.length; i += 1) {
    const problem = javaScalarProblem(scalar, value[i])
    if (problem) return `item ${i + 1}: ${problem}`
  }
  return null
}

function javaDefaultReturn(type) {
  if (type === 'int' || type === 'long') return '0'
  if (type === 'double') return '0.0'
  if (type === 'boolean') return 'false'
  return 'null'
}

// ------------------------------------------------------------------ starters

/** What the student starts from when the creator did not write anything. */
export function defaultStarter(mode, language, functionName, params, paramTypes = [], returnType = 'int') {
  const names = params.join(', ')
  if (mode === EXERCISE_MODE.OUTPUT) {
    switch (language) {
      case 'python':
        return '# leia a entrada com input() e imprima o resultado com print()\n'
      case 'java':
        return 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // seu codigo aqui\n    }\n}\n'
      case 'c':
        return '#include <stdio.h>\n\nint main() {\n    // seu codigo aqui\n    return 0;\n}\n'
      case 'cpp':
        return '#include <iostream>\nusing namespace std;\n\nint main() {\n    // seu codigo aqui\n    return 0;\n}\n'
      default:
        return '// leia a entrada de process.stdin e imprima com console.log()\n'
    }
  }
  if (language === 'java') {
    // Only the method(s), no class: the gateway puts them inside its own Main class.
    const signature = params.map((param, index) => `${paramTypes[index] ?? 'int'} ${param}`).join(', ')
    return `static ${returnType || 'int'} ${functionName}(${signature}) {\n    // seu codigo aqui\n    return ${javaDefaultReturn(returnType || 'int')};\n}\n`
  }
  if (language === 'python') return `def ${functionName}(${names}):\n    # seu codigo aqui\n    pass\n`
  return `function ${functionName}(${names}) {\n  // seu codigo aqui\n}\n`
}

export function emptyTest(mode, paramCount) {
  return mode === EXERCISE_MODE.FUNCTION
    ? { key: nextKey(), visible: false, args: Array.from({ length: paramCount }, () => ''), expected: '' }
    : { key: nextKey(), visible: false, input: '', expected: '' }
}

/** A fresh exercise: function mode in Python, the most common starting point. */
export function emptyExercise(mode = EXERCISE_MODE.FUNCTION, language = 'python') {
  const functionName = 'soma'
  const params = mode === EXERCISE_MODE.FUNCTION ? ['a', 'b'] : []
  const typed = mode === EXERCISE_MODE.FUNCTION && language === 'java'
  const paramTypes = typed ? params.map(() => 'int') : []
  const returnType = typed ? 'int' : ''
  return {
    mode,
    language,
    title: '',
    functionName: mode === EXERCISE_MODE.FUNCTION ? functionName : '',
    params,
    paramTypes,
    returnType,
    starterCode: defaultStarter(mode, language, functionName, params, paramTypes, returnType),
    solutionCode: '',
    tests: [{ ...emptyTest(mode, params.length), visible: true }, emptyTest(mode, params.length)],
  }
}

// --------------------------------------------------------------- conversions

/** Text -> JSON value, or `undefined` when the text is not valid JSON. */
export function parseJsonCell(text) {
  if (typeof text !== 'string' || text.trim() === '') return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** JSON value -> the text shown in a cell. */
export function formatJsonCell(value) {
  return value === undefined ? '' : JSON.stringify(value)
}

/** The form -> the body of `exercise` in the block request. Call only on a form without problems. */
export function exerciseToPayload(form) {
  const isFunction = form.mode === EXERCISE_MODE.FUNCTION
  const typed = isFunction && form.language === 'java'
  return {
    mode: form.mode,
    title: form.title.trim() || null,
    functionName: isFunction ? form.functionName.trim() : null,
    params: isFunction ? form.params : null,
    paramTypes: typed ? form.paramTypes : null,
    returnType: typed ? form.returnType : null,
    starterCode: form.starterCode,
    solutionCode: form.solutionCode,
    tests: form.tests.map((test) =>
      isFunction
        ? { visible: test.visible, args: test.args.map(parseJsonCell), expected: parseJsonCell(test.expected) }
        : { visible: test.visible, input: test.input, expected: test.expected },
    ),
  }
}

/** `OwnerExercise` from GET /blocks/{id}/exercise/spec -> the form. */
export function exerciseFromServer(owner) {
  const { language, exercise } = owner
  const isFunction = exercise.mode === EXERCISE_MODE.FUNCTION
  return {
    mode: exercise.mode,
    language,
    title: exercise.title ?? '',
    functionName: exercise.functionName ?? '',
    params: exercise.params ?? [],
    paramTypes: exercise.paramTypes ?? [],
    returnType: exercise.returnType ?? '',
    starterCode: exercise.starterCode ?? '',
    solutionCode: exercise.solutionCode ?? '',
    tests: exercise.tests.map((test) =>
      isFunction
        ? { key: nextKey(), visible: test.visible, args: test.args.map(formatJsonCell), expected: formatJsonCell(test.expected) }
        : { key: nextKey(), visible: test.visible, input: test.input ?? '', expected: test.expected ?? '' },
    ),
  }
}

// ---------------------------------------------------------------- validation

function cellProblem(text, label, javaType) {
  if (text.trim() === '') return `${label} esta vazio`
  if (text.length > MAX_VALUE_CHARS) return `${label} e grande demais`
  const value = parseJsonCell(text)
  if (value === undefined) return `${label} nao e um valor valido (textos usam aspas: "abc")`
  if (javaType) {
    const problem = javaValueProblem(javaType, value)
    if (problem) return `${label} (${javaType}): ${problem}`
  }
  return null
}

/** Everything still wrong with the form, in the order the creator would fix it. Empty = ready. */
export function exerciseProblems(form) {
  const problems = []
  const isFunction = form.mode === EXERCISE_MODE.FUNCTION
  const typed = isFunction && form.language === 'java'

  if (isFunction) {
    if (!IDENTIFIER.test(form.functionName.trim())) problems.push('o nome da funcao e invalido')
    if (typed) {
      if (form.paramTypes.length !== form.params.length || form.paramTypes.some((type) => !JAVA_TYPES.includes(type))) {
        problems.push('escolha o tipo de cada parametro')
      }
      if (!JAVA_TYPES.includes(form.returnType)) problems.push('escolha o tipo de retorno')
    }
    const seen = new Set()
    for (const param of form.params) {
      if (!IDENTIFIER.test(param)) problems.push(`o parametro "${param}" e invalido`)
      else if (seen.has(param)) problems.push(`o parametro "${param}" esta repetido`)
      seen.add(param)
    }
  }

  if (form.solutionCode.trim() === '') problems.push('falta a solucao de referencia')
  if (form.tests.length === 0) problems.push('adicione pelo menos um teste')
  else if (!form.tests.some((test) => test.visible)) problems.push('deixe pelo menos um teste visivel')

  form.tests.forEach((test, index) => {
    const label = `teste ${index + 1}`
    if (isFunction) {
      test.args.forEach((arg, argIndex) => {
        const problem = cellProblem(arg, `${label}, ${form.params[argIndex] ?? 'argumento'}`, typed ? form.paramTypes[argIndex] : null)
        if (problem) problems.push(problem)
      })
      const problem = cellProblem(test.expected, `${label}, retorno esperado`, typed ? form.returnType : null)
      if (problem) problems.push(problem)
    } else if (test.input.length > MAX_VALUE_CHARS || test.expected.length > MAX_VALUE_CHARS) {
      problems.push(`o ${label} e grande demais`)
    }
  })

  return problems
}

/** Same checks with a user-facing sentence: "Exercicio "Soma": falta a solucao de referencia". */
export function exerciseBlockerMessage(form) {
  const [first] = exerciseProblems(form)
  if (!first) return null
  const name = form.title.trim() ? `"${form.title.trim()}"` : 'sem titulo'
  return `Exercicio ${name}: ${first}.`
}

// ------------------------------------------------------------------ display

/** `soma(2, 3)` / `maior([3, 9, 2])` from a function-mode test's argument values. */
export function formatCall(functionName, args) {
  return `${functionName}(${args.map((arg) => JSON.stringify(arg)).join(', ')})`
}

/** Text of one test result's value: JSON for function mode, the raw text for output mode. */
export function formatActual(mode, actual) {
  if (actual === null || actual === undefined) return mode === EXERCISE_MODE.FUNCTION ? 'null' : ''
  return mode === EXERCISE_MODE.FUNCTION ? JSON.stringify(actual) : String(actual)
}

/**
 * One sentence about the first reference-solution test that failed, from a ValidationResponse (or
 * the `validation` of a 422). `fixWith` is the text to put in the "expected" cell if the creator
 * decides the solution is right and the expectation was wrong.
 */
export function describeFirstFailure(form, validation) {
  if (validation.compileError) {
    return { sentence: 'A solucao de referencia nao compilou.', detail: validation.compileError, fixWith: null }
  }
  const failed = validation.results.find((result) => !result.passed)
  if (!failed) {
    if (validation.timedOut) return { sentence: 'A solucao estourou o tempo limite.', detail: null, fixWith: null }
    return { sentence: 'A solucao nao passou em todos os testes.', detail: validation.stderr || null, fixWith: null }
  }

  const test = form.tests[failed.index]
  const where = `Teste ${failed.index + 1} (${test?.visible ? 'visivel' : 'escondido'})`
  const isFunction = form.mode === EXERCISE_MODE.FUNCTION

  if (failed.error) {
    return { sentence: `${where}: a solucao deu erro.`, detail: failed.error, fixWith: null, index: failed.index }
  }

  const actualText = formatActual(form.mode, failed.actual)
  if (isFunction) {
    const call = `${form.functionName}(${test.args.join(', ')})`
    return {
      sentence: `${where}: ${call} deveria retornar ${test.expected}, mas a solucao retornou ${actualText}.`,
      detail: null,
      fixWith: actualText,
      index: failed.index,
    }
  }
  return {
    sentence: `${where}: com a entrada abaixo deveria imprimir "${test.expected.trim()}", mas a solucao imprimiu "${actualText.trim()}".`,
    detail: test.input,
    fixWith: actualText.replace(/\s+$/, ''),
    index: failed.index,
  }
}

/** Counts "2 visiveis · 3 escondidos". */
export function testCounts(tests) {
  const visible = tests.filter((test) => test.visible).length
  return { visible, hidden: tests.length - visible }
}

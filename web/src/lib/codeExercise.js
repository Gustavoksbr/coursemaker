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
  function: ['javascript', 'python', 'typescript', 'php', 'ruby', 'java', 'csharp', 'cpp', 'c', 'go', 'rust', 'kotlin'],
  output: ['javascript', 'python', 'typescript', 'php', 'ruby', 'java', 'csharp', 'cpp', 'c', 'go', 'rust', 'kotlin'],
}

export const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  python: 'Python',
  typescript: 'TypeScript',
  php: 'PHP',
  ruby: 'Ruby',
  java: 'Java',
  csharp: 'C#',
  cpp: 'C++',
  c: 'C',
  go: 'Go',
  rust: 'Rust',
  kotlin: 'Kotlin',
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

let keyCounter = 0
/** Stable React key for a test row (rows have no id until the server stores them). */
function nextKey() {
  keyCounter += 1
  return `t${keyCounter}`
}

// ----------------------------------------------------------- typed languages

/**
 * Statically typed languages: a function-mode exercise declares a type per parameter and for the
 * return value, from one closed set (named like Java's, below). The gateway turns each value into a
 * literal of the language's own type and the editor shows the language's own spelling (`[]int` in
 * Go, `Vec<i32>` in Rust...), but what is stored is always the name from the set.
 */
export const TYPED_LANGUAGES = ['java', 'csharp', 'cpp', 'c', 'go', 'rust', 'kotlin']

export function isTypedLanguage(language) {
  return TYPED_LANGUAGES.includes(language)
}

/**
 * The closed set of types (Java's names). The gateway builds Java literals from it; the backend checks
 * the same list.
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

const NATIVE_SCALARS = {
  java: { int: 'int', long: 'long', double: 'double', boolean: 'boolean', String: 'String' },
  csharp: { int: 'int', long: 'long', double: 'double', boolean: 'bool', String: 'string' },
  cpp: { int: 'int', long: 'long long', double: 'double', boolean: 'bool', String: 'std::string' },
  c: { int: 'int', long: 'long long', double: 'double', boolean: 'bool', String: 'const char*' },
  go: { int: 'int', long: 'int64', double: 'float64', boolean: 'bool', String: 'string' },
  rust: { int: 'i32', long: 'i64', double: 'f64', boolean: 'bool', String: 'String' },
  kotlin: { int: 'Int', long: 'Long', double: 'Double', boolean: 'Boolean', String: 'String' },
}

/** How `type` (a name from the closed set) is spelled in `language`: `int[]` -> `[]int` in Go. */
export function nativeType(language, type) {
  const scalar = javaScalarOf(type)
  const names = NATIVE_SCALARS[language]
  if (!scalar || !names || language === 'java') return type
  const name = names[scalar]
  const array = type.endsWith('[]')
  const list = type.startsWith('List<')
  if (!array && !list) return name
  switch (language) {
    case 'csharp':
      return array ? `${name}[]` : `List<${name}>`
    case 'cpp':
      return `std::vector<${name}>`
    case 'go':
      return `[]${name}`
    case 'rust':
      return `Vec<${name}>`
    case 'kotlin':
      if (list) return `List<${name}>`
      return scalar === 'String' ? 'Array<String>' : `${name}Array`
    default:
      return type
  }
}

/** One parameter as the language declares it: `int a`, `a int` (Go), `a: i32` (Rust, Kotlin). */
export function typedParam(language, type, name) {
  const native = nativeType(language, type)
  if (language === 'go') return `${name} ${native}`
  if (language === 'rust' || language === 'kotlin') return `${name}: ${native}`
  return `${native} ${name}`
}

/**
 * The types a function-mode exercise may use in `language`. C has only scalars and text (an array
 * needs a separate length); C++, Go and Rust spell arrays and lists the same, so only the array form
 * is offered.
 */
export function typeOptions(language) {
  if (language === 'c') return JAVA_TYPES.filter((type) => !isJavaCollection(type))
  if (['cpp', 'go', 'rust'].includes(language)) return JAVA_TYPES.filter((type) => !type.startsWith('List<'))
  return JAVA_TYPES
}

/** Keeps `type` when `language` accepts it, else the closest one it does (a list becomes an array...). */
export function coerceType(language, type) {
  const options = typeOptions(language)
  if (options.includes(type)) return type
  const scalar = javaScalarOf(type) ?? 'int'
  const array = `${scalar}[]`
  return options.includes(array) && type.startsWith('List<') ? array : scalar
}

const EMPTY_SCALARS = { int: '0', long: '0', double: '0.0', boolean: 'false', String: '""' }

const EMPTY_RETURN = {
  java: { scalar: { ...EMPTY_SCALARS, String: 'null' }, collection: 'null' },
  csharp: {
    scalar: EMPTY_SCALARS,
    array: (name) => `new ${name}[0]`,
    list: (name) => `new List<${name}>()`,
  },
  cpp: { scalar: EMPTY_SCALARS, collection: '{}' },
  c: { scalar: EMPTY_SCALARS, collection: 'NULL' },
  go: { scalar: EMPTY_SCALARS, collection: 'nil' },
  rust: { scalar: { ...EMPTY_SCALARS, String: 'String::new()' }, collection: 'Vec::new()' },
  kotlin: {
    scalar: { ...EMPTY_SCALARS, long: '0L' },
    array: (name, scalar) =>
      ({ int: 'intArrayOf()', long: 'longArrayOf()', double: 'doubleArrayOf()', boolean: 'booleanArrayOf()' })[scalar] ??
      'arrayOf()',
    list: () => 'emptyList()',
  },
}

/** A placeholder `return` value of `type` in `language` so the starter code compiles. */
function defaultReturn(language, type) {
  const scalar = javaScalarOf(type) ?? 'int'
  const table = EMPTY_RETURN[language]
  if (!isJavaCollection(type)) return table.scalar[scalar]
  if (type.endsWith('[]') && table.array) return table.array(NATIVE_SCALARS[language][scalar], scalar)
  if (type.startsWith('List<') && table.list) return table.list(NATIVE_SCALARS[language][scalar], scalar)
  return table.collection
}

/** The signature of the function the student writes, in `language`'s own syntax. */
function typedStarter(language, functionName, params, paramTypes, returnType) {
  const ret = returnType || 'int'
  const typeOf = (index) => paramTypes[index] ?? 'int'
  const body = (value) => `    // seu codigo aqui\n    ${value}\n`
  const fallback = defaultReturn(language, ret)
  const cStyle = () => params.map((param, index) => `${nativeType(language, typeOf(index))} ${param}`).join(', ')
  const nameFirst = (separator) =>
    params.map((param, index) => `${param}${separator}${nativeType(language, typeOf(index))}`).join(', ')
  switch (language) {
    case 'java':
      // Only the method(s), no class: the gateway puts them inside its own Main class.
      return `static ${ret} ${functionName}(${cStyle()}) {\n${body(`return ${fallback};`)}}\n`
    case 'csharp':
      return `static ${nativeType(language, ret)} ${functionName}(${cStyle()}) {\n${body(`return ${fallback};`)}}\n`
    case 'cpp':
    case 'c':
      return `${nativeType(language, ret)} ${functionName}(${cStyle()}) {\n${body(`return ${fallback};`)}}\n`
    case 'go':
      return `func ${functionName}(${nameFirst(' ')}) ${nativeType(language, ret)} {\n${body(`return ${fallback}`)}}\n`
    case 'rust':
      return `fn ${functionName}(${nameFirst(': ')}) -> ${nativeType(language, ret)} {\n${body(fallback)}}\n`
    default:
      // kotlin
      return `fun ${functionName}(${nameFirst(': ')}): ${nativeType(language, ret)} {\n${body(`return ${fallback}`)}}\n`
  }
}

// ------------------------------------------------------------------ starters

const OUTPUT_STARTERS = {
  python: '# leia a entrada com input() e imprima o resultado com print()\n',
  javascript: '// leia a entrada de process.stdin e imprima com console.log()\n',
  typescript: "// leia a entrada com require('fs').readFileSync(0, 'utf8') e imprima com console.log()\n",
  php: '<?php\n// leia a entrada com fgets(STDIN) e imprima com echo\n',
  ruby: '# leia a entrada com gets e imprima com puts\n',
  java: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // seu codigo aqui\n    }\n}\n',
  csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        // leia com Console.ReadLine() e imprima com Console.WriteLine()\n    }\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n    // seu codigo aqui\n    return 0;\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // seu codigo aqui\n    return 0;\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    var n int\n    fmt.Scan(&n)\n    // seu codigo aqui\n}\n',
  rust: 'use std::io;\n\nfn main() {\n    let mut line = String::new();\n    io::stdin().read_line(&mut line).unwrap();\n    // seu codigo aqui\n}\n',
  kotlin: 'fun main() {\n    val line = readLine()\n    // seu codigo aqui\n}\n',
}

/** What the student starts from when the creator did not write anything. */
export function defaultStarter(mode, language, functionName, params, paramTypes = [], returnType = 'int') {
  const names = params.join(', ')
  if (mode === EXERCISE_MODE.OUTPUT) return OUTPUT_STARTERS[language] ?? OUTPUT_STARTERS.javascript
  if (isTypedLanguage(language)) return typedStarter(language, functionName, params, paramTypes, returnType)
  switch (language) {
    case 'python':
      return `def ${functionName}(${names}):\n    # seu codigo aqui\n    pass\n`
    case 'php':
      return `function ${functionName}(${params.map((param) => `$${param}`).join(', ')}) {\n    // seu codigo aqui\n}\n`
    case 'ruby':
      return `def ${functionName}(${names})\n  # seu codigo aqui\nend\n`
    default:
      // javascript and typescript
      return `function ${functionName}(${names}) {\n  // seu codigo aqui\n}\n`
  }
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
  const typed = mode === EXERCISE_MODE.FUNCTION && isTypedLanguage(language)
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
  const typed = isFunction && isTypedLanguage(form.language)
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
  const typed = isFunction && isTypedLanguage(form.language)
  const allowedTypes = typeOptions(form.language)

  if (isFunction) {
    if (!IDENTIFIER.test(form.functionName.trim())) problems.push('o nome da funcao e invalido')
    if (typed) {
      if (form.paramTypes.length !== form.params.length || form.paramTypes.some((type) => !allowedTypes.includes(type))) {
        problems.push('escolha o tipo de cada parametro')
      }
      if (!allowedTypes.includes(form.returnType)) problems.push('escolha o tipo de retorno')
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

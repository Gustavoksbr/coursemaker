import { describe, expect, it } from 'vitest'
import {
  describeFirstFailure,
  emptyExercise,
  EXERCISE_MODE,
  exerciseBlockerMessage,
  exerciseFromServer,
  exerciseProblems,
  exerciseToPayload,
  formatCall,
  javaScalarOf,
  javaValueProblem,
  testCounts,
} from './codeExercise'

function functionForm(overrides = {}) {
  return {
    ...emptyExercise(EXERCISE_MODE.FUNCTION, 'python'),
    title: 'Soma',
    solutionCode: 'def soma(a, b):\n    return a + b\n',
    tests: [
      { key: 'a', visible: true, args: ['2', '3'], expected: '5' },
      { key: 'b', visible: false, args: ['-5', '-7'], expected: '-12' },
    ],
    ...overrides,
  }
}

describe('exerciseToPayload', () => {
  it('parses each cell as JSON in function mode', () => {
    const payload = exerciseToPayload(
      functionForm({
        params: ['lista', 'reverso'],
        tests: [{ key: 'a', visible: true, args: ['[3, 1, 2]', 'false'], expected: '["a", null]' }],
      }),
    )
    expect(payload.tests[0]).toEqual({ visible: true, args: [[3, 1, 2], false], expected: ['a', null] })
    expect(payload.functionName).toBe('soma')
    expect(payload.params).toEqual(['lista', 'reverso'])
  })

  it('keeps raw text in output mode and drops function-only fields', () => {
    const form = {
      ...emptyExercise(EXERCISE_MODE.OUTPUT, 'cpp'),
      solutionCode: 'int main(){}',
      tests: [{ key: 'a', visible: true, input: '2 3\n', expected: '5' }],
    }
    const payload = exerciseToPayload(form)
    expect(payload.tests[0]).toEqual({ visible: true, input: '2 3\n', expected: '5' })
    expect(payload.functionName).toBeNull()
    expect(payload.params).toBeNull()
    expect(payload.title).toBeNull()
  })
})

describe('exerciseFromServer', () => {
  it('turns stored JSON values back into editable text', () => {
    const form = exerciseFromServer({
      language: 'python',
      exercise: {
        mode: 'function',
        title: 'Ordena',
        functionName: 'ordena',
        params: ['lista'],
        starterCode: 'def ordena(lista):\n    pass\n',
        solutionCode: 'def ordena(lista):\n    return sorted(lista)\n',
        tests: [{ visible: true, args: [[3, 1]], expected: [1, 3] }],
      },
    })
    expect(form.tests[0].args).toEqual(['[3,1]'])
    expect(form.tests[0].expected).toBe('[1,3]')
    expect(form.language).toBe('python')
  })

  it('round-trips with exerciseToPayload', () => {
    const original = functionForm()
    const back = exerciseToPayload(
      exerciseFromServer({ language: 'python', exercise: exerciseToPayload(original) }),
    )
    expect(back).toEqual(exerciseToPayload(original))
  })
})

describe('exerciseProblems', () => {
  it('accepts a complete exercise', () => {
    expect(exerciseProblems(functionForm())).toEqual([])
    expect(exerciseBlockerMessage(functionForm())).toBeNull()
  })

  it('asks for the reference solution', () => {
    expect(exerciseProblems(functionForm({ solutionCode: '  ' }))).toContain('falta a solucao de referencia')
  })

  it('needs a visible test', () => {
    const form = functionForm({ tests: [{ key: 'a', visible: false, args: ['1', '2'], expected: '3' }] })
    expect(exerciseProblems(form)).toContain('deixe pelo menos um teste visivel')
  })

  it('flags cells that are empty or not JSON, pointing at the test and the parameter', () => {
    const form = functionForm({
      tests: [{ key: 'a', visible: true, args: ['abc', ''], expected: '' }],
    })
    const problems = exerciseProblems(form).join(' | ')
    expect(problems).toContain('teste 1, a nao e um valor valido')
    expect(problems).toContain('teste 1, b esta vazio')
    expect(problems).toContain('teste 1, retorno esperado esta vazio')
  })

  it('rejects bad function and parameter names', () => {
    expect(exerciseProblems(functionForm({ functionName: 'soma;' }))).toContain('o nome da funcao e invalido')
    expect(exerciseProblems(functionForm({ params: ['a', 'a'], tests: [] }))).toContain('o parametro "a" esta repetido')
  })

  it('names the exercise in the blocker message', () => {
    expect(exerciseBlockerMessage(functionForm({ solutionCode: '' }))).toBe(
      'Exercicio "Soma": falta a solucao de referencia.',
    )
  })

  it('does not parse output mode cells as JSON', () => {
    const form = {
      ...emptyExercise(EXERCISE_MODE.OUTPUT, 'python'),
      solutionCode: 'print(1)',
      tests: [{ key: 'a', visible: true, input: 'not json', expected: 'also not json' }],
    }
    expect(exerciseProblems(form)).toEqual([])
  })
})

describe('describeFirstFailure', () => {
  it('describes a wrong value in function mode and offers the actual one', () => {
    const form = functionForm({ functionName: 'soma' })
    const failure = describeFirstFailure(form, {
      compileError: null,
      results: [
        { index: 0, passed: true, actual: 5 },
        { index: 1, passed: false, actual: -12 },
      ],
    })
    expect(failure.sentence).toBe(
      'Teste 2 (escondido): soma(-5, -7) deveria retornar -12, mas a solucao retornou -12.',
    )
    expect(failure.fixWith).toBe('-12')
    expect(failure.index).toBe(1)
  })

  it('reports a crash without offering to copy a value', () => {
    const failure = describeFirstFailure(functionForm(), {
      results: [{ index: 0, passed: false, error: 'ZeroDivisionError: division by zero' }],
    })
    expect(failure.sentence).toContain('Teste 1 (visivel): a solucao deu erro')
    expect(failure.detail).toContain('ZeroDivisionError')
    expect(failure.fixWith).toBeNull()
  })

  it('reports a compile error with the compiler message', () => {
    const form = { ...emptyExercise(EXERCISE_MODE.OUTPUT, 'cpp'), tests: [] }
    const failure = describeFirstFailure(form, { compileError: 'main.cpp:1: error', results: [] })
    expect(failure.sentence).toBe('A solucao de referencia nao compilou.')
    expect(failure.detail).toBe('main.cpp:1: error')
  })

  it('uses the typed input and trims trailing newlines in output mode', () => {
    const form = {
      ...emptyExercise(EXERCISE_MODE.OUTPUT, 'python'),
      tests: [{ key: 'a', visible: true, input: '2 3\n', expected: '6' }],
    }
    const failure = describeFirstFailure(form, { results: [{ index: 0, passed: false, actual: '5\n' }] })
    expect(failure.sentence).toContain('deveria imprimir "6"')
    expect(failure.sentence).toContain('imprimiu "5"')
    expect(failure.detail).toBe('2 3\n')
    expect(failure.fixWith).toBe('5')
  })
})

describe('small helpers', () => {
  it('formats a call and counts visible tests', () => {
    expect(formatCall('maior', [[3, 9, 2]])).toBe('maior([3,9,2])')
    expect(testCounts(functionForm().tests)).toEqual({ visible: 1, hidden: 1 })
  })

  it('seeds a fresh exercise with a visible and a hidden test and one cell per parameter', () => {
    const form = emptyExercise()
    expect(form.mode).toBe('function')
    expect(form.tests).toHaveLength(2)
    expect(form.tests[0].visible).toBe(true)
    expect(form.tests[0].args).toHaveLength(form.params.length)
    expect(form.starterCode).toContain('def soma(a, b)')
  })
})

describe('java (typed) function mode', () => {
  function javaForm(overrides = {}) {
    return {
      ...emptyExercise(EXERCISE_MODE.FUNCTION, 'java'),
      title: 'Soma',
      solutionCode: 'static int soma(int a, int b) {\n  return a + b;\n}\n',
      tests: [{ key: 'a', visible: true, args: ['2', '3'], expected: '5' }],
      ...overrides,
    }
  }

  it('starts with int parameters, an int return and a typed starter without a class', () => {
    const form = emptyExercise(EXERCISE_MODE.FUNCTION, 'java')
    expect(form.paramTypes).toEqual(['int', 'int'])
    expect(form.returnType).toBe('int')
    expect(form.starterCode).toContain('static int soma(int a, int b) {')
    expect(form.starterCode).not.toContain('class')
  })

  it('sends the types only for java', () => {
    expect(exerciseToPayload(javaForm())).toMatchObject({ paramTypes: ['int', 'int'], returnType: 'int' })
    const python = exerciseToPayload(functionForm())
    expect(python.paramTypes).toBeNull()
    expect(python.returnType).toBeNull()
  })

  it('round-trips the types from the server', () => {
    const original = javaForm({ paramTypes: ['int[]', 'String'], returnType: 'List<Integer>' })
    const back = exerciseFromServer({ language: 'java', exercise: exerciseToPayload(original) })
    expect(back.paramTypes).toEqual(['int[]', 'String'])
    expect(back.returnType).toBe('List<Integer>')
  })

  it('accepts a complete exercise', () => {
    expect(exerciseProblems(javaForm())).toEqual([])
  })

  it('flags values that do not fit the declared type, naming test, parameter and type', () => {
    const form = javaForm({ tests: [{ key: 'a', visible: true, args: ['"abc"', '3'], expected: '5' }] })
    expect(exerciseProblems(form).join(' | ')).toContain('teste 1, a (int): esperado um numero inteiro')
  })

  it('checks the expected value against the return type', () => {
    const form = javaForm({ returnType: 'boolean' })
    expect(exerciseProblems(form).join(' | ')).toContain('retorno esperado (boolean)')
  })

  it('asks for the types when they are missing', () => {
    expect(exerciseProblems(javaForm({ paramTypes: ['int'] }))).toContain('escolha o tipo de cada parametro')
    expect(exerciseProblems(javaForm({ returnType: '' }))).toContain('escolha o tipo de retorno')
  })

  it('does not apply type rules to python', () => {
    expect(exerciseProblems(functionForm())).toEqual([])
  })
})

describe('javaValueProblem', () => {
  it('knows the scalar of each type', () => {
    expect(javaScalarOf('int')).toBe('int')
    expect(javaScalarOf('String[]')).toBe('String')
    expect(javaScalarOf('List<Double>')).toBe('double')
    expect(javaScalarOf('Object')).toBeNull()
    expect(javaScalarOf('int[][]')).toBeNull()
  })

  it.each([
    ['int', 2, null],
    ['int', 2.5, 'esperado um numero inteiro'],
    ['int', 3000000000, 'fora do intervalo de int'],
    ['long', 3000000000, null],
    ['double', 2, null],
    ['boolean', 'true', 'esperado true ou false'],
    ['String', null, null],
    ['int', null, 'null so vale para String, array e lista'],
    ['int[]', [1, 2], null],
    ['int[]', null, null],
    ['int[]', [1, 'a'], 'item 2: esperado um numero inteiro'],
    ['int[]', 5, 'esperado uma lista [..]'],
    ['List<String>', ['a', null], null],
    ['List<Integer>', [1, null], 'item 2: null so vale para String, array e lista'],
  ])('%s with %j', (type, value, expected) => {
    expect(javaValueProblem(type, value)).toBe(expected)
  })
})

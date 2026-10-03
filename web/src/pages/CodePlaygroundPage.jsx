import { useState } from 'react'
import { runCode, runSquareExercise } from '@/api/codeExecution'
import { errorMessage } from '@/lib/api'
import CodeEditor from '@/components/blocks/CodeEditor'

const LANGUAGES = {
  javascript: 'console.log("Hello, CourseMaker!")',
  python: 'print("Hello, CourseMaker!")',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, CourseMaker!");\n    }\n}',
}

const EXERCISE_STARTER = ['function square(n) {', '  // retorne o quadrado de n', '}'].join('\n')

// Prototipo cru, sem estilo do design system - so pra testar a experiencia de "escrever codigo,
// rodar, ver resultado" antes de construir o bloco de verdade em cima disso.
export default function CodePlaygroundPage() {
  const [language, setLanguage] = useState('javascript')
  const [code, setCode] = useState(LANGUAGES.javascript)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  const [exerciseCode, setExerciseCode] = useState(EXERCISE_STARTER)
  const [exerciseResult, setExerciseResult] = useState(null)
  const [exerciseError, setExerciseError] = useState('')
  const [exerciseRunning, setExerciseRunning] = useState(false)

  async function handleExercise() {
    setExerciseRunning(true)
    setExerciseError('')
    setExerciseResult(null)
    try {
      setExerciseResult(await runSquareExercise({ language: 'javascript', code: exerciseCode }))
    } catch (err) {
      setExerciseError(errorMessage(err))
    } finally {
      setExerciseRunning(false)
    }
  }

  function handleLanguageChange(next) {
    setLanguage(next)
    setCode(LANGUAGES[next])
    setResult(null)
    setError('')
  }

  async function handleRun() {
    setRunning(true)
    setError('')
    setResult(null)
    try {
      const data = await runCode({ language, code })
      setResult(data)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 16px', fontFamily: 'monospace' }}>
      <h1>Playground de codigo (prototipo)</h1>

      <div style={{ marginBottom: 12 }}>
        {Object.keys(LANGUAGES).map((lang) => (
          <button
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            disabled={running}
            style={{
              marginRight: 8,
              padding: '4px 10px',
              fontWeight: lang === language ? 'bold' : 'normal',
            }}
          >
            {lang}
          </button>
        ))}
      </div>

      <CodeEditor value={code} onChange={setCode} language={language} minHeight="280px" />

      <div style={{ margin: '12px 0' }}>
        <button onClick={handleRun} disabled={running} style={{ padding: '8px 16px' }}>
          {running ? 'Rodando...' : 'Rodar'}
        </button>
      </div>

      {error && (
        <pre style={{ background: '#fee', color: '#900', padding: 12, whiteSpace: 'pre-wrap' }}>
          {error}
        </pre>
      )}

      {result && (
        <div>
          {result.compileOutput && (
            <>
              <strong>Compile:</strong>
              <pre style={{ background: '#fff3cd', padding: 12, whiteSpace: 'pre-wrap' }}>
                {result.compileOutput}
              </pre>
            </>
          )}
          <strong>stdout:</strong>
          <pre style={{ background: '#111', color: '#0f0', padding: 12, whiteSpace: 'pre-wrap', minHeight: 40 }}>
            {result.stdout || '(vazio)'}
          </pre>
          {result.stderr && (
            <>
              <strong>stderr:</strong>
              <pre style={{ background: '#111', color: '#f66', padding: 12, whiteSpace: 'pre-wrap' }}>
                {result.stderr}
              </pre>
            </>
          )}
          <small>exit code: {result.exitCode}</small>
        </div>
      )}

      <hr style={{ margin: '32px 0' }} />

      <h2>Atividade: quadrado (JavaScript)</h2>
      <p>
        Escreva so a funcao <code>square(n)</code>. O servidor sorteia um n, chama a sua funcao e
        confere se o retorno e n * n.
      </p>
      <CodeEditor value={exerciseCode} onChange={setExerciseCode} language="javascript" minHeight="140px" />
      <div style={{ margin: '12px 0' }}>
        <button onClick={handleExercise} disabled={exerciseRunning} style={{ padding: '8px 16px' }}>
          {exerciseRunning ? 'Testando...' : 'Testar'}
        </button>
      </div>
      {exerciseError && (
        <pre style={{ background: '#fee', color: '#900', padding: 12, whiteSpace: 'pre-wrap' }}>
          {exerciseError}
        </pre>
      )}
      {exerciseResult && (
        <pre
          style={{
            background: exerciseResult.passed ? '#dfd' : '#fee',
            color: exerciseResult.passed ? '#060' : '#900',
            padding: 12,
            whiteSpace: 'pre-wrap',
          }}
        >
          {[
            exerciseResult.passed ? 'PASSOU' : 'FALHOU',
            `entrada: ${exerciseResult.input}`,
            `esperado: ${exerciseResult.expected}`,
            `recebido: ${exerciseResult.actual || '(vazio)'}`,
            exerciseResult.stderr ? `\nstderr:\n${exerciseResult.stderr}` : '',
          ]
            .filter(Boolean)
            .join('\n')}
        </pre>
      )}
    </div>
  )
}

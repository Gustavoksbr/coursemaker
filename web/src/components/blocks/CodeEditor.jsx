import CodeMirror from '@uiw/react-codemirror'
import { indentLess, indentMore } from '@codemirror/commands'
import { keymap } from '@codemirror/view'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { php } from '@codemirror/lang-php'
import { rust } from '@codemirror/lang-rust'
import { go } from '@codemirror/lang-go'
import { StreamLanguage } from '@codemirror/language'
import { csharp, kotlin } from '@codemirror/legacy-modes/mode/clike'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'

const LANGUAGE_EXTENSIONS = {
  javascript: () => javascript(),
  python: () => python(),
  java: () => java(),
  c: () => cpp(),
  cpp: () => cpp(),
  typescript: () => javascript({ typescript: true }),
  php: () => php(),
  rust: () => rust(),
  go: () => go(),
  csharp: () => StreamLanguage.define(csharp),
  kotlin: () => StreamLanguage.define(kotlin),
  ruby: () => StreamLanguage.define(ruby),
}

const INDENT = '    '

// Tab sem selecao insere espacos NO CURSOR (como o VS Code); com texto selecionado, indenta as
// linhas inteiras. Shift+Tab sempre tira indentacao. O comando "indentWithTab" padrao do
// CodeMirror indentaria a linha toda mesmo sem selecao, que nao e o que se espera aqui.
// Trade-off de acessibilidade: Tab nao move mais o foco; Esc seguido de Tab sai do editor.
function tabAtCursor(view) {
  const { state } = view
  if (state.selection.ranges.some((range) => !range.empty)) {
    return indentMore(view)
  }
  view.dispatch(state.replaceSelection(INDENT), { scrollIntoView: true, userEvent: 'input' })
  return true
}

const TAB_KEYMAP = keymap.of([{ key: 'Tab', run: tabAtCursor, shift: indentLess }])

/** Editor de codigo estilo VS Code: realce de sintaxe, auto-indent, fecha ({["', numeros de linha. */
export default function CodeEditor({ value, onChange, language = 'javascript', minHeight = '160px', readOnly = false }) {
  const languageExtension = (LANGUAGE_EXTENSIONS[language] ?? LANGUAGE_EXTENSIONS.javascript)()

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={vscodeDark}
      indentWithTab={false}
      readOnly={readOnly}
      extensions={[languageExtension, TAB_KEYMAP]}
      minHeight={minHeight}
      basicSetup={{
        tabSize: 4,
        lineNumbers: true,
        foldGutter: true,
        autocompletion: true,
        closeBrackets: true,
        bracketMatching: true,
        indentOnInput: true,
        highlightActiveLine: true,
      }}
      style={{ fontSize: 14, borderRadius: 6, overflow: 'hidden' }}
    />
  )
}

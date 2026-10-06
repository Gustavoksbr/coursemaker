package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const (
	maxTests     = 100
	maxBodyBytes = 1 << 20
	maxCodeBytes = 50_000
)

var identifierRe = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

// Cada harness e anexado DEPOIS do codigo do usuario, no mesmo arquivo, e roda todos os testes
// num unico processo (uma execucao do Piston por envio, nao uma por teste). Ele le do stdin so o
// marcador e os argumentos - os valores esperados nunca entram no sandbox, entao o codigo do
// usuario nao tem como le-los. Cada resultado sai em uma linha "<marcador>{json}", assim o que o
// usuario imprimir nao se mistura com os resultados, e o que ja foi impresso sobrevive se um
// teste travar e o Piston matar o processo por tempo.
var harnesses = map[string]struct {
	template string
	language string
}{
	"javascript": {language: "javascript", template: `
;(() => {
  const __fs = require('fs');
  const __input = JSON.parse(__fs.readFileSync(0, 'utf8'));
  const __fn = typeof __FUNCTION__ === 'function' ? __FUNCTION__ : null;
  __input.tests.forEach((test, i) => {
    let line;
    try {
      if (!__fn) throw new Error('a funcao __FUNCTION__ nao foi encontrada');
      const value = __fn(...test.args);
      line = JSON.stringify({ i, ok: true, value: value === undefined ? null : value });
    } catch (e) {
      line = JSON.stringify({ i, ok: false, error: (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e)) });
    }
    process.stdout.write(__input.marker + line + '\n');
  });
})();
`},
	"typescript": {language: "typescript", template: `
(function () {
  const __fs = require('fs');
  const __input: any = JSON.parse(__fs.readFileSync(0, 'utf8'));
  const __fn: any = __FUNCTION__;
  __input.tests.forEach(function (test: any, i: number) {
    let line: string;
    try {
      const value = __fn(...test.args);
      line = JSON.stringify({ i: i, ok: true, value: value === undefined ? null : value });
    } catch (e: any) {
      line = JSON.stringify({ i: i, ok: false, error: (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e)) });
    }
    process.stdout.write(__input.marker + line + '\n');
  });
})();
`},
	"php": {language: "php", template: `

function __cm_run() {
  $data = json_decode(file_get_contents('php://stdin'), true);
  foreach ($data['tests'] as $i => $t) {
    try {
      if (!function_exists('__FUNCTION__')) throw new Error('a funcao __FUNCTION__ nao foi encontrada');
      $value = call_user_func_array('__FUNCTION__', $t['args']);
      $json = json_encode($value, JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION);
      $line = '{"i":' . $i . ',"ok":true,"value":' . $json . '}';
    } catch (Throwable $e) {
      $line = json_encode(['i' => $i, 'ok' => false, 'error' => get_class($e) . ': ' . $e->getMessage()]);
    }
    echo $data['marker'] . $line . "\n";
    flush();
  }
}

__cm_run();
`},
	"ruby": {language: "ruby", template: `

require 'json'

def __cm_run
  data = JSON.parse($stdin.read)
  data['tests'].each_with_index do |t, i|
    begin
      raise NameError, 'a funcao __FUNCTION__ nao foi encontrada' unless respond_to?(:__FUNCTION__, true)
      value = send(:__FUNCTION__, *t['args'])
      line = JSON.generate({ 'i' => i, 'ok' => true, 'value' => value })
    rescue Exception => e
      line = JSON.generate({ 'i' => i, 'ok' => false, 'error' => e.class.name + ': ' + e.message })
    end
    $stdout.write(data['marker'] + line + "\n")
    $stdout.flush
  end
end

__cm_run
`},
	"python": {language: "python", template: `
import json as __json, sys as __sys

def __cm_run():
    __data = __json.loads(__sys.stdin.read())
    __fn = globals().get("__FUNCTION__")
    for __i, __t in enumerate(__data["tests"]):
        try:
            if not callable(__fn):
                raise NameError("a funcao __FUNCTION__ nao foi encontrada")
            __line = __json.dumps({"i": __i, "ok": True, "value": __fn(*__t["args"])}, allow_nan=False)
        except Exception as __e:
            __line = __json.dumps({"i": __i, "ok": False, "error": type(__e).__name__ + ": " + str(__e)})
        __sys.stdout.write(__data["marker"] + __line + "\n")
        __sys.stdout.flush()

__cm_run()
`},
}

type testCase struct {
	Args     []json.RawMessage `json:"args"`
	Expected json.RawMessage   `json:"expected"`
}

type runTestsRequest struct {
	Language     string     `json:"language"`
	Code         string     `json:"code"`
	FunctionName string     `json:"functionName"`
	Tests        []testCase `json:"tests"`
	// ParamTypes so e usado em Java (tipado): um tipo por parametro, do conjunto fechado de
	// javaharness.go. Nas linguagens dinamicas e ignorado.
	ParamTypes []string `json:"paramTypes"`
}

type testResult struct {
	Index  int             `json:"index"`
	Passed bool            `json:"passed"`
	Actual json.RawMessage `json:"actual,omitempty"`
	Error  string          `json:"error,omitempty"`
}

type runTestsResponse struct {
	Results     []testResult `json:"results"`
	PassedCount int          `json:"passedCount"`
	Total       int          `json:"total"`
	Output      string       `json:"output"`
	Stderr      string       `json:"stderr"`
	ExitCode    int          `json:"exitCode"`
	TimedOut    bool         `json:"timedOut"`
	// CompileError so aparece em Java quando o codigo nem compilou: nenhum teste rodou.
	CompileError string `json:"compileError,omitempty"`
}

// harnessEvent e uma linha "<marcador>{json}" emitida pelo harness.
type harnessEvent struct {
	I     int             `json:"i"`
	Ok    bool            `json:"ok"`
	Value json.RawMessage `json:"value"`
	Error string          `json:"error"`
}

// handleRunTests roda a funcao do usuario contra uma lista de testes (args -> expected) e devolve
// o resultado de cada um. O gateway nao guarda nada: quem chama (o backend) e dono dos testes e
// decide o que mostrar ao aluno - testes escondidos nunca devem ser repassados alem do backend.
func handleRunTests(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"message":"metodo nao permitido"}`, http.StatusMethodNotAllowed)
		return
	}

	var req runTestsRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes)).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": "corpo invalido"})
		return
	}

	if msg := validateRunTests(req); msg != "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": msg})
		return
	}

	started := time.Now()
	resp, err := runTests(req)
	if err == nil {
		extra := ""
		if resp.TimedOut {
			extra += " (tempo limite)"
		}
		if resp.CompileError != "" {
			extra += " (erro de compilacao)"
		}
		logRun("run-tests", req.Language+" "+req.FunctionName+"()", resp.PassedCount, resp.Total, time.Since(started), extra)
		logTestsDetail(req, resp)
	} else {
		log.Printf("[run-tests] %s: falhou: %v", req.Language, err)
	}
	if err != nil {
		var bad *requestError
		if errors.As(err, &bad) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"message": bad.message})
			return
		}
		writeJSON(w, http.StatusBadGateway, map[string]string{"message": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func validateRunTests(req runTestsRequest) string {
	_, dynamic := harnesses[req.Language]
	_, typed := typedBuilders[req.Language]
	if !dynamic && !typed {
		return fmt.Sprintf("linguagem nao suportada para testes: %s", req.Language)
	}
	if !identifierRe.MatchString(req.FunctionName) {
		return "functionName invalido"
	}
	if strings.TrimSpace(req.Code) == "" || len(req.Code) > maxCodeBytes {
		return "code vazio ou grande demais"
	}
	if len(req.Tests) == 0 || len(req.Tests) > maxTests {
		return fmt.Sprintf("informe entre 1 e %d testes", maxTests)
	}
	if typed {
		return typedParamTypesProblem(req.Language, req.ParamTypes, req.Tests)
	}
	return ""
}

func runTests(req runTestsRequest) (*runTestsResponse, error) {
	marker, err := newMarker()
	if err != nil {
		return nil, err
	}

	var (
		program string
		stdin   string
		lang    languageInfo
	)
	if build, ok := typedBuilders[req.Language]; ok {
		// As linguagens tipadas nao recebem nada pelo stdin: os argumentos viram literais no codigo gerado.
		program, err = build(req, marker)
		if err != nil {
			return nil, &requestError{err.Error()}
		}
		lang = languages[req.Language]
	} else {
		harness := harnesses[req.Language]
		code := req.Code
		switch req.Language {
		case "typescript":
			// O tsc compila com alvo antigo (ES5); esta diretiva libera a biblioteca moderna (Map, includes...).
			code = tsLibDirective + code
		case "php":
			// O arquivo PHP precisa abrir com a tag; se o aluno ja a escreveu, nao repetimos.
			code = "<?php " + strings.TrimPrefix(strings.TrimLeft(code, " \t\r\n"), "<?php")
		}
		program = code + "\n" + strings.ReplaceAll(harness.template, "__FUNCTION__", req.FunctionName)
		stdin, err = buildStdin(marker, req.Tests)
		if err != nil {
			return nil, err
		}
		lang = languages[harness.language]
	}

	piston, err := runCode(lang, program, stdin)
	if err != nil {
		return nil, err
	}

	output, events := parseHarnessOutput(piston.Stdout, marker)
	results := gradeResults(req.Tests, events, piston)

	passed := 0
	for _, res := range results {
		if res.Passed {
			passed++
		}
	}

	response := &runTestsResponse{
		Results:     results,
		PassedCount: passed,
		Total:       len(results),
		Output:      output,
		Stderr:      piston.Stderr,
		ExitCode:    piston.ExitCode,
		TimedOut:    piston.TimedOut,
	}
	if len(events) == 0 {
		response.CompileError = compileErrorOf(req, piston)
	}
	return response, nil
}

// tsLibDirective e a primeira linha do arquivo TypeScript; os erros do tsc voltam com o numero da linha
// corrigido (menos 1) para baterem com o editor.
const tsLibDirective = `/// <reference lib="es2022" />` + "\n" +
	// Sem os tipos do Node, o tsc nao conhece require/process nem os modulos de entrada e saida; a mesma
	// linha do codigo do aluno os declara como `any` (sem mudar a numeracao).
	`declare const require: any; declare const process: any; declare const module: any; ` +
	`declare module "fs"; declare module "readline"; declare module "path"; declare module "util"; ` +
	`declare module "os"; declare module "assert"; `

var tsLineRe = regexp.MustCompile(`main\.ts\((\d+),`)

// shiftTSLines desconta a linha da diretiva que o gateway acrescenta no topo do arquivo TypeScript.
func shiftTSLines(out string) string {
	return tsLineRe.ReplaceAllStringFunc(out, func(m string) string {
		sub := tsLineRe.FindStringSubmatch(m)
		n, _ := strconv.Atoi(sub[1])
		return "main.ts(" + strconv.Itoa(n-1) + ","
	})
}

// compileErrorOf devolve a mensagem do compilador quando o codigo nem compilou (nenhum teste rodou), ou "".
func compileErrorOf(req runTestsRequest, piston *executeResponse) string {
	switch {
	case req.Language == "java":
		// Java compila na mesma etapa em que roda; o launcher termina a mensagem com uma linha fixa.
		if isJavaCompileFailure(piston.Stderr) {
			return piston.Stderr + javaCallHint(req, piston.Stderr)
		}
	case req.Language == "go":
		// `go run` compila e roda numa etapa so; o erro de compilacao comeca com esta linha.
		if strings.HasPrefix(piston.Stderr, "# command-line-arguments") {
			return piston.Stderr + typedCallHint(req, piston.Stderr)
		}
	case piston.CompileFailed:
		out := strings.TrimLeft(piston.CompileOutput, "\r\n")
		if req.Language == "typescript" {
			out = shiftTSLines(out)
		}
		if req.Language == "c" || req.Language == "cpp" {
			out = fixGccSnippets(out, req.Code)
		}
		if _, typed := typedBuilders[req.Language]; !typed {
			return out // TypeScript: o erro ja cita o nome que faltou, sem assinatura para sugerir
		}
		return out + typedCallHint(req, out)
	}
	return ""
}

// requestError e um problema do PEDIDO (ex.: um valor que nao cabe no tipo declarado), nao do Piston.
type requestError struct{ message string }

func (e *requestError) Error() string { return e.message }

func newMarker() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "@@CM-" + hex.EncodeToString(b) + "@@", nil
}

// buildStdin monta o que o programa do aluno recebe: so o marcador e os argumentos. Os valores
// esperados ficam de fora de proposito.
func buildStdin(marker string, tests []testCase) (string, error) {
	type stdinTest struct {
		Args []json.RawMessage `json:"args"`
	}
	payload := struct {
		Marker string      `json:"marker"`
		Tests  []stdinTest `json:"tests"`
	}{Marker: marker}

	for _, t := range tests {
		args := t.Args
		if args == nil {
			args = []json.RawMessage{}
		}
		payload.Tests = append(payload.Tests, stdinTest{Args: args})
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// parseHarnessOutput separa o que o usuario imprimiu (devolvido em "output") das linhas de
// resultado do harness. Usa strings.Index porque o usuario pode ter impresso algo sem quebra de
// linha logo antes do marcador.
func parseHarnessOutput(stdout, marker string) (string, map[int]harnessEvent) {
	events := map[int]harnessEvent{}
	var user strings.Builder

	for _, line := range strings.SplitAfter(stdout, "\n") {
		idx := strings.Index(line, marker)
		if idx < 0 {
			user.WriteString(line)
			continue
		}
		user.WriteString(line[:idx])

		var ev harnessEvent
		if err := json.Unmarshal([]byte(strings.TrimSpace(line[idx+len(marker):])), &ev); err == nil {
			events[ev.I] = ev
		}
	}
	return user.String(), events
}

func gradeResults(tests []testCase, events map[int]harnessEvent, piston *executeResponse) []testResult {
	results := make([]testResult, len(tests))
	firstMissing := true

	for i, test := range tests {
		ev, ok := events[i]
		switch {
		case !ok:
			results[i] = testResult{Index: i, Error: missingReason(piston, firstMissing)}
			firstMissing = false
		case !ev.Ok:
			results[i] = testResult{Index: i, Error: ev.Error}
		default:
			results[i] = testResult{
				Index:  i,
				Passed: jsonEqual(ev.Value, test.Expected),
				Actual: ev.Value,
			}
		}
	}
	return results
}

// missingReason explica por que um teste nao reportou resultado. Se o tempo estourou, o primeiro
// teste sem resultado e o que travou; os demais simplesmente nao chegaram a rodar.
func missingReason(piston *executeResponse, first bool) string {
	switch {
	case piston.TimedOut && first:
		return "tempo limite excedido"
	case piston.TimedOut:
		return "nao executado (o tempo limite estourou em um teste anterior)"
	default:
		return "o programa terminou antes de executar este teste"
	}
}

// jsonEqual compara por valor JSON (ignora espacos/ordem de chaves). Numeros sao comparados com uma
// tolerancia relativa minuscula (1e-9): 0.1+0.2 e 0.3 sao iguais, como o aluno espera, ja que cada
// linguagem imprime o ponto flutuante do seu jeito.
func jsonEqual(a, b json.RawMessage) bool {
	var av, bv any
	if len(a) == 0 {
		a = json.RawMessage("null")
	}
	if len(b) == 0 {
		b = json.RawMessage("null")
	}
	if json.Unmarshal(a, &av) != nil || json.Unmarshal(b, &bv) != nil {
		return false
	}
	return valuesEqual(av, bv)
}

func valuesEqual(a, b any) bool {
	switch x := a.(type) {
	case float64:
		y, ok := b.(float64)
		if !ok {
			return false
		}
		if x == y {
			return true
		}
		scale := math.Max(1, math.Max(math.Abs(x), math.Abs(y)))
		return math.Abs(x-y) <= 1e-9*scale
	case []any:
		y, ok := b.([]any)
		if !ok || len(x) != len(y) {
			return false
		}
		for i := range x {
			if !valuesEqual(x[i], y[i]) {
				return false
			}
		}
		return true
	case map[string]any:
		y, ok := b.(map[string]any)
		if !ok || len(x) != len(y) {
			return false
		}
		for k, v := range x {
			w, ok := y[k]
			if !ok || !valuesEqual(v, w) {
				return false
			}
		}
		return true
	}
	return reflect.DeepEqual(a, b)
}

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"unicode/utf8"
)

// Modo "saida do programa": o aluno escreve um programa completo que le do stdin e imprime no
// stdout (como beecrowd/URI). Diferente do /run-tests, aqui nao ha harness - cada teste e uma
// execucao propria do Piston, com o stdin daquele teste. Isso permite qualquer linguagem, inclusive
// as compiladas (Java, C, C++), e o valor esperado nunca chega ao Piston, nem de forma indireta.
const (
	maxOutputTests     = 20
	maxStdinBytes      = 10_000
	maxExpectedBytes   = 10_000
	maxActualBytes     = 10_000
	outputConcurrency  = 4
	javaCompileFailure = "error: compilation failed" // ultima linha do launcher de fonte unico do java
)

type outputTest struct {
	Input    string `json:"input"`
	Expected string `json:"expected"`
}

type runOutputRequest struct {
	Language string       `json:"language"`
	Code     string       `json:"code"`
	Tests    []outputTest `json:"tests"`
}

type outputResult struct {
	Index  int  `json:"index"`
	Passed bool `json:"passed"`
	// Actual e o que o programa imprimiu, como saiu (so truncado se enorme). A comparacao com o
	// esperado e feita sobre uma versao normalizada, ver normalizeOutput.
	Actual   string `json:"actual"`
	Stderr   string `json:"stderr,omitempty"`
	ExitCode int    `json:"exitCode"`
	TimedOut bool   `json:"timedOut,omitempty"`
}

type runOutputResponse struct {
	Results     []outputResult `json:"results"`
	PassedCount int            `json:"passedCount"`
	Total       int            `json:"total"`
	// CompileError so aparece quando o programa nem compilou; nesse caso nenhum teste rodou e
	// todos vem como reprovados.
	CompileError string `json:"compileError,omitempty"`
}

// handleRunOutput roda o programa do usuario uma vez por teste e compara o stdout. Como no
// /run-tests, o gateway nao guarda nada: o backend e dono dos testes e decide o que o aluno ve.
func handleRunOutput(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"message":"metodo nao permitido"}`, http.StatusMethodNotAllowed)
		return
	}

	var req runOutputRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes)).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": "corpo invalido"})
		return
	}

	if msg := validateRunOutput(req); msg != "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": msg})
		return
	}

	resp, err := runOutput(req)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"message": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

// isJavaCompileFailure reconhece o fim fixo da mensagem do launcher de fonte unico do Java.
func isJavaCompileFailure(stderr string) bool {
	return strings.HasSuffix(strings.TrimSpace(stderr), javaCompileFailure)
}

// concurrencyFor limita Java e C++ a 2 execucoes simultaneas: o Piston mata qualquer execucao em 3 s
// (compilacao incluida), e varias JVMs/compilacoes disputando CPU estouram esse teto - ate uma que ja
// tinha imprimido a resposta certa. Em linguagens interpretadas nao ha esse custo de partida.
func concurrencyFor(lang languageInfo) int {
	switch lang.pistonLanguage {
	case "java", "c++":
		return 2
	}
	return outputConcurrency
}

func validateRunOutput(req runOutputRequest) string {
	if _, ok := languages[req.Language]; !ok {
		return fmt.Sprintf("linguagem nao suportada: %s", req.Language)
	}
	if strings.TrimSpace(req.Code) == "" || len(req.Code) > maxCodeBytes {
		return "code vazio ou grande demais"
	}
	if len(req.Tests) == 0 || len(req.Tests) > maxOutputTests {
		return fmt.Sprintf("informe entre 1 e %d testes", maxOutputTests)
	}
	for _, t := range req.Tests {
		if len(t.Input) > maxStdinBytes || len(t.Expected) > maxExpectedBytes {
			return fmt.Sprintf("input e expected devem ter no maximo %d bytes", maxStdinBytes)
		}
	}
	return ""
}

func runOutput(req runOutputRequest) (*runOutputResponse, error) {
	lang := languages[req.Language]
	results := make([]outputResult, len(req.Tests))

	// O primeiro teste roda sozinho: se o programa nem compila, os outros 19 seriam o mesmo erro
	// repetido (e em Java/C++ cada execucao compila de novo).
	first, compileErr, err := runOutputTest(lang, req.Code, req.Tests[0], 0)
	if err != nil {
		return nil, err
	}
	if compileErr != "" {
		for i := range results {
			results[i] = outputResult{Index: i, ExitCode: first.ExitCode}
		}
		return &runOutputResponse{Results: results, Total: len(results), CompileError: compileErr}, nil
	}
	results[0] = first

	var (
		wg       sync.WaitGroup
		mu       sync.Mutex
		firstErr error
		slots    = make(chan struct{}, concurrencyFor(lang))
	)
	for i := 1; i < len(req.Tests); i++ {
		wg.Add(1)
		slots <- struct{}{}
		go func(i int) {
			defer wg.Done()
			defer func() { <-slots }()

			res, _, err := runOutputTest(lang, req.Code, req.Tests[i], i)
			mu.Lock()
			defer mu.Unlock()
			if err != nil && firstErr == nil {
				firstErr = err
				return
			}
			results[i] = res
		}(i)
	}
	wg.Wait()
	if firstErr != nil {
		return nil, firstErr
	}

	passed := 0
	for _, res := range results {
		if res.Passed {
			passed++
		}
	}
	return &runOutputResponse{Results: results, PassedCount: passed, Total: len(results)}, nil
}

// runOutputTest executa um teste. O segundo retorno e a mensagem do compilador, preenchida so
// quando o programa nao compilou.
func runOutputTest(lang languageInfo, code string, test outputTest, index int) (outputResult, string, error) {
	piston, err := runCode(lang, code, test.Input)
	if err != nil {
		return outputResult{}, "", err
	}

	if piston.CompileFailed {
		return outputResult{Index: index, ExitCode: piston.ExitCode}, piston.CompileOutput, nil
	}
	// Java compila na mesma etapa em que roda, entao o erro vem como falha de execucao; o launcher
	// sempre termina a mensagem com esta linha, o que permite distinguir de um erro em tempo de execucao.
	if lang.pistonLanguage == "java" && isJavaCompileFailure(piston.Stderr) {
		return outputResult{Index: index, ExitCode: piston.ExitCode}, piston.Stderr, nil
	}

	passed := !piston.TimedOut && piston.ExitCode == 0 &&
		normalizeOutput(piston.Stdout) == normalizeOutput(test.Expected)

	return outputResult{
		Index:    index,
		Passed:   passed,
		Actual:   truncateOutput(piston.Stdout),
		Stderr:   truncateOutput(piston.Stderr),
		ExitCode: piston.ExitCode,
		TimedOut: piston.TimedOut,
	}, "", nil
}

// normalizeOutput deixa a comparacao tolerante ao que quase nunca e o ponto do exercicio: fim de
// linha do Windows, espacos sobrando no fim de cada linha e linhas em branco no final. Espacos no
// comeco da linha e linhas em branco no meio continuam contando.
func normalizeOutput(s string) string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	lines := strings.Split(s, "\n")
	for i, line := range lines {
		lines[i] = strings.TrimRight(line, " \t\r")
	}
	end := len(lines)
	for end > 0 && lines[end-1] == "" {
		end--
	}
	return strings.Join(lines[:end], "\n")
}

func truncateOutput(s string) string {
	if len(s) <= maxActualBytes {
		return s
	}
	cut := maxActualBytes
	for cut > 0 && !utf8.RuneStart(s[cut]) {
		cut--
	}
	return s[:cut] + "\n... (saida truncada)"
}

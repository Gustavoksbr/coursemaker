package main

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"
)

// Logs do gateway. Por padrao, uma linha-resumo por pedido (linguagem, quantos testes passaram, tempo):
// nunca o codigo do aluno nem os valores esperados. Com LOG_DETAILS=true tambem sai uma linha por teste
// com entrada, esperado e obtido - util para depurar, mas inclui os esperados dos testes escondidos.

var logDetails = os.Getenv("LOG_DETAILS") == "true"

// short deixa um valor numa linha so e limita o tamanho.
func short(s string) string {
	s = strings.ReplaceAll(strings.ReplaceAll(s, "\r", ""), "\n", "\\n")
	if len(s) > 200 {
		return truncateAt(s, 200) + "..."
	}
	return s
}

func logRun(kind, language string, passed, total int, took time.Duration, extra string) {
	log.Printf("[%s] %s: %d/%d testes passaram em %d ms%s", kind, language, passed, total, took.Milliseconds(), extra)
}

func logTestsDetail(req runTestsRequest, resp *runTestsResponse) {
	if !logDetails {
		return
	}
	for i, test := range req.Tests {
		args := make([]string, len(test.Args))
		for j, a := range test.Args {
			args[j] = string(a)
		}
		line := fmt.Sprintf("  teste %d  entrada=%s(%s)  esperado=%s", i+1, req.FunctionName, strings.Join(args, ", "), short(string(test.Expected)))
		if i < len(resp.Results) {
			res := resp.Results[i]
			line += fmt.Sprintf("  obtido=%s  passou=%v", short(string(res.Actual)), res.Passed)
			if res.Error != "" {
				line += "  erro=" + short(res.Error)
			}
		}
		log.Print(line)
	}
	if resp.Output != "" {
		log.Printf("  saida do aluno: %s", short(resp.Output))
	}
	if resp.CompileError != "" {
		log.Printf("  compilador: %s", short(resp.CompileError))
	}
}

func logOutputDetail(req runOutputRequest, resp *runOutputResponse) {
	if !logDetails {
		return
	}
	for i, test := range req.Tests {
		line := fmt.Sprintf("  teste %d  entrada=%s  esperado=%s", i+1, short(test.Input), short(test.Expected))
		if i < len(resp.Results) {
			res := resp.Results[i]
			line += fmt.Sprintf("  obtido=%s  passou=%v", short(res.Actual), res.Passed)
			if res.TimedOut {
				line += "  (tempo limite)"
			}
			if res.Stderr != "" {
				line += "  stderr=" + short(res.Stderr)
			}
		}
		log.Print(line)
	}
	if resp.CompileError != "" {
		log.Printf("  compilador: %s", short(resp.CompileError))
	}
}

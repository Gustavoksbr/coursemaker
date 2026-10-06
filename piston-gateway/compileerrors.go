package main

import (
	"fmt"
	"regexp"
	"strings"
)

var (
	gccSnippetRe = regexp.MustCompile(`^(\s*)(\d+) \| (.*)$`)
	gccCaretRe   = regexp.MustCompile(`^\s*\|\s`)
	// generatedRefRe pega "main.rs:69", "main.cs(4,31)", "main.kt:56:16" e afins: o numero da linha onde o erro caiu.
	generatedRefRe = regexp.MustCompile(`main\.\w+[:(](\d+)`)
)

// fixGccSnippets conserta os trechos de codigo que o gcc cita nos erros. O codigo que o gcc compila tem
// um prefixo (includes) que a diretiva #line esconde dos numeros de linha, mas nao dos trechos: eles
// vem do arquivo real. Aqui cada trecho volta a ser a linha certa do codigo do aluno, e os trechos de
// linhas que o aluno nao escreveu (o codigo gerado) somem junto com a seta que os acompanha.
func fixGccSnippets(output, studentCode string) string {
	student := strings.Split(strings.ReplaceAll(studentCode, "\r\n", "\n"), "\n")
	var kept []string
	dropCaret := false
	for _, line := range strings.Split(output, "\n") {
		if m := gccSnippetRe.FindStringSubmatch(line); m != nil {
			var n int
			fmt.Sscanf(m[2], "%d", &n)
			if n >= 1 && n <= len(student) {
				kept = append(kept, fmt.Sprintf("%s%s | %s", m[1], m[2], student[n-1]))
				dropCaret = false
			} else {
				dropCaret = true
			}
			continue
		}
		if dropCaret && gccCaretRe.MatchString(line) {
			dropCaret = false
			continue
		}
		dropCaret = false
		kept = append(kept, line)
	}
	return strings.Join(kept, "\n")
}

// errorsInGeneratedCode diz se alguma mensagem aponta para alem da ultima linha do aluno, ou seja,
// para a chamada de teste que o gateway gerou.
func errorsInGeneratedCode(output, studentCode string) bool {
	lines := strings.Count(studentCode, "\n") + 1
	for _, m := range generatedRefRe.FindAllStringSubmatch(output, -1) {
		var n int
		fmt.Sscanf(m[1], "%d", &n)
		if n > lines {
			return true
		}
	}
	return false
}

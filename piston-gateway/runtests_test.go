package main

import (
	"encoding/json"
	"strings"
	"testing"
)

func raw(s string) json.RawMessage { return json.RawMessage(s) }

func TestJSONEqual(t *testing.T) {
	cases := []struct {
		a, b string
		want bool
	}{
		{"1", "1.0", true},
		{`"a"`, `"a"`, true},
		{`[1,2,3]`, `[1, 2, 3]`, true},
		{`{"a":1,"b":2}`, `{"b":2,"a":1}`, true},
		{"1", "2", false},
		{`[1,2]`, `[2,1]`, false},
		{"null", "", true},
		{`"1"`, "1", false},
	}
	for _, c := range cases {
		if got := jsonEqual(raw(c.a), raw(c.b)); got != c.want {
			t.Errorf("jsonEqual(%s, %s) = %v, want %v", c.a, c.b, got, c.want)
		}
	}
}

func TestBuildStdinNeverIncludesExpected(t *testing.T) {
	tests := []testCase{{Args: []json.RawMessage{raw("3")}, Expected: raw("SEGREDO-ESCONDIDO")}}
	stdin, err := buildStdin("@@M@@", tests)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(stdin, "SEGREDO") || strings.Contains(stdin, "expected") {
		t.Fatalf("stdin vazou o valor esperado: %s", stdin)
	}
	if !strings.Contains(stdin, "@@M@@") || !strings.Contains(stdin, `"args":[3]`) {
		t.Fatalf("stdin sem marcador/args: %s", stdin)
	}
}

func TestBuildStdinNilArgsBecomeEmptyArray(t *testing.T) {
	stdin, _ := buildStdin("@@M@@", []testCase{{}})
	if !strings.Contains(stdin, `"args":[]`) {
		t.Fatalf("args nulo deveria virar []: %s", stdin)
	}
}

func TestParseHarnessOutputSeparatesUserOutput(t *testing.T) {
	m := "@@M@@"
	stdout := "oi do usuario\n" +
		"sem quebra" + m + `{"i":0,"ok":true,"value":9}` + "\n" +
		m + `{"i":1,"ok":false,"error":"boom"}` + "\n" +
		m + `lixo-nao-json` + "\n"

	output, events := parseHarnessOutput(stdout, m)

	if output != "oi do usuario\nsem quebra" {
		t.Errorf("output do usuario = %q", output)
	}
	if len(events) != 2 || !events[0].Ok || string(events[0].Value) != "9" || events[1].Error != "boom" {
		t.Errorf("eventos inesperados: %+v", events)
	}
}

func TestGradeResults(t *testing.T) {
	tests := []testCase{
		{Expected: raw("4")}, // passa
		{Expected: raw("4")}, // valor errado
		{Expected: raw("4")}, // excecao
		{Expected: raw("4")}, // sem resultado: travou
		{Expected: raw("4")}, // sem resultado: nao rodou
	}
	events := map[int]harnessEvent{
		0: {I: 0, Ok: true, Value: raw("4")},
		1: {I: 1, Ok: true, Value: raw("5")},
		2: {I: 2, Ok: false, Error: "TypeError: x"},
	}

	got := gradeResults(tests, events, &executeResponse{TimedOut: true})

	if !got[0].Passed || got[1].Passed || got[2].Passed || got[3].Passed || got[4].Passed {
		t.Fatalf("passed inesperado: %+v", got)
	}
	if got[2].Error != "TypeError: x" {
		t.Errorf("erro da excecao = %q", got[2].Error)
	}
	if got[3].Error != "tempo limite excedido" || !strings.Contains(got[4].Error, "nao executado") {
		t.Errorf("motivos de timeout: %q / %q", got[3].Error, got[4].Error)
	}
}

func TestGradeResultsProgramDiedEarly(t *testing.T) {
	got := gradeResults([]testCase{{Expected: raw("1")}}, map[int]harnessEvent{}, &executeResponse{})
	if got[0].Passed || !strings.Contains(got[0].Error, "terminou antes") {
		t.Fatalf("resultado inesperado: %+v", got[0])
	}
}

func TestValidateRunTests(t *testing.T) {
	ok := runTestsRequest{Language: "javascript", Code: "function f(){}", FunctionName: "f", Tests: []testCase{{}}}
	if msg := validateRunTests(ok); msg != "" {
		t.Fatalf("requisicao valida rejeitada: %s", msg)
	}

	bad := map[string]runTestsRequest{
		"linguagem":    {Language: "java", Code: "x", FunctionName: "f", Tests: []testCase{{}}},
		"funcao":       {Language: "javascript", Code: "x", FunctionName: "f(); process.exit()", Tests: []testCase{{}}},
		"funcao vazia": {Language: "python", Code: "x", FunctionName: "", Tests: []testCase{{}}},
		"codigo":       {Language: "python", Code: "  ", FunctionName: "f", Tests: []testCase{{}}},
		"sem testes":   {Language: "python", Code: "x", FunctionName: "f"},
		"testes demais": {Language: "python", Code: "x", FunctionName: "f",
			Tests: make([]testCase, maxTests+1)},
	}
	for name, req := range bad {
		if validateRunTests(req) == "" {
			t.Errorf("%s: deveria ter sido rejeitado", name)
		}
	}
}

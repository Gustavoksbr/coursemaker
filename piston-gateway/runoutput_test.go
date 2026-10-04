package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

func TestNormalizeOutput(t *testing.T) {
	cases := []struct{ name, in, want string }{
		{"igual", "5\n", "5"},
		{"fim de linha do windows", "a\r\nb\r\n", "a\nb"},
		{"espacos no fim da linha", "a  \nb\t\n", "a\nb"},
		{"linhas em branco no final", "a\n\n\n", "a"},
		{"linha em branco no meio conta", "a\n\nb", "a\n\nb"},
		{"espaco no comeco conta", "  a", "  a"},
		{"vazio", "", ""},
		{"so quebras", "\n\n", ""},
	}
	for _, c := range cases {
		if got := normalizeOutput(c.in); got != c.want {
			t.Errorf("%s: normalizeOutput(%q) = %q, queria %q", c.name, c.in, got, c.want)
		}
	}
	if normalizeOutput(" a") == normalizeOutput("a") {
		t.Error("espaco no comeco deveria diferenciar")
	}
}

func TestTruncateOutput(t *testing.T) {
	if got := truncateOutput("curto"); got != "curto" {
		t.Errorf("nao deveria truncar: %q", got)
	}
	long := strings.Repeat("é", maxActualBytes) // 2 bytes por caractere: o corte cai no meio de um
	got := truncateOutput(long)
	if !strings.HasSuffix(got, "(saida truncada)") {
		t.Errorf("faltou o aviso de truncamento")
	}
	body := strings.TrimSuffix(got, "\n... (saida truncada)")
	if strings.ContainsRune(body, '�') {
		t.Errorf("o corte quebrou um caractere no meio")
	}
}

func TestValidateRunOutput(t *testing.T) {
	ok := runOutputRequest{Language: "python", Code: "print(1)", Tests: []outputTest{{Input: "", Expected: "1"}}}
	if msg := validateRunOutput(ok); msg != "" {
		t.Fatalf("requisicao valida rejeitada: %s", msg)
	}

	bad := map[string]runOutputRequest{
		"linguagem":     {Language: "cobol", Code: "x", Tests: ok.Tests},
		"codigo vazio":  {Language: "python", Code: "  ", Tests: ok.Tests},
		"sem testes":    {Language: "python", Code: "x"},
		"testes demais": {Language: "python", Code: "x", Tests: make([]outputTest, maxOutputTests+1)},
		"input gigante": {Language: "python", Code: "x",
			Tests: []outputTest{{Input: strings.Repeat("a", maxStdinBytes+1)}}},
	}
	for name, req := range bad {
		if validateRunOutput(req) == "" {
			t.Errorf("%s: deveria ser rejeitado", name)
		}
	}
}

// fakePiston simula o /execute do Piston: responde conforme o stdin recebido e guarda tudo que
// recebeu, para conferir que o valor esperado nunca e enviado ao sandbox.
type fakePiston struct {
	mu       sync.Mutex
	bodies   []string
	received int
}

func newFakePiston(t *testing.T, respond func(req pistonRequest) string) *fakePiston {
	t.Helper()
	fp := &fakePiston{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req pistonRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad", http.StatusBadRequest)
			return
		}
		b, _ := json.Marshal(req)

		fp.mu.Lock()
		fp.bodies = append(fp.bodies, string(b))
		fp.received++
		fp.mu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(respond(req)))
	}))
	old := pistonURL
	pistonURL = srv.URL
	t.Cleanup(func() { pistonURL = old; srv.Close() })
	return fp
}

// runResp monta a resposta do Piston para uma execucao que chegou a rodar.
func runResp(stdout, stderr string, code int, status string) string {
	var st *string
	if status != "" {
		st = &status
	}
	b, _ := json.Marshal(map[string]any{"run": map[string]any{
		"stdout": stdout, "stderr": stderr, "code": code, "status": st,
	}})
	return string(b)
}

func TestRunOutputGradesEachTest(t *testing.T) {
	fp := newFakePiston(t, func(req pistonRequest) string {
		switch req.Stdin {
		case "2 3\n":
			return runResp("5\n", "", 0, "")
		case "10 20\n":
			return runResp("31\n", "", 0, "") // errado
		case "loop\n":
			return runResp("", "", 0, "TO")
		case "boom\n":
			return runResp("5", "Traceback...", 1, "RE") // saida certa, mas morreu: reprova
		default:
			return runResp("5  \r\n\r\n", "", 0, "") // espacos e linhas em branco sobrando: aceita
		}
	})

	resp, err := runOutput(runOutputRequest{
		Language: "python",
		Code:     "print(sum(map(int, input().split())))",
		Tests: []outputTest{
			{Input: "2 3\n", Expected: "5"},
			{Input: "10 20\n", Expected: "SEGREDO-30"},
			{Input: "loop\n", Expected: "SEGREDO-1"},
			{Input: "boom\n", Expected: "5"},
			{Input: "x\n", Expected: "5"},
		},
	})
	if err != nil {
		t.Fatal(err)
	}

	want := []bool{true, false, false, false, true}
	for i, w := range want {
		if resp.Results[i].Passed != w {
			t.Errorf("teste %d: passed = %v, queria %v (%+v)", i, resp.Results[i].Passed, w, resp.Results[i])
		}
	}
	if resp.PassedCount != 2 || resp.Total != 5 {
		t.Errorf("contagem = %d/%d, queria 2/5", resp.PassedCount, resp.Total)
	}
	if !resp.Results[2].TimedOut {
		t.Error("o teste do loop deveria marcar timedOut")
	}
	if resp.Results[1].Actual != "31\n" {
		t.Errorf("actual = %q", resp.Results[1].Actual)
	}
	if resp.Results[3].Stderr != "Traceback..." {
		t.Errorf("stderr = %q", resp.Results[3].Stderr)
	}
	for i, r := range resp.Results {
		if r.Index != i {
			t.Errorf("resultado %d veio com index %d", i, r.Index)
		}
	}
	for _, body := range fp.bodies {
		if strings.Contains(body, "SEGREDO") {
			t.Fatalf("o valor esperado vazou para o Piston: %s", body)
		}
	}
	if fp.received != 5 {
		t.Errorf("o Piston deveria receber 1 execucao por teste, recebeu %d", fp.received)
	}
}

func TestRunOutputStopsAtCompileError(t *testing.T) {
	fp := newFakePiston(t, func(req pistonRequest) string {
		// Igual ao Piston de verdade: o "run" so repete a saida do compilador.
		return `{"compile":{"stdout":"","stderr":"main.cpp:1:1: error: expected unqualified-id\nchmod: cannot access 'a.out': No such file or directory\n","code":1,"status":"RE"},` +
			`"run":{"stdout":"","stderr":"main.cpp:1:1: error: expected unqualified-id","code":1,"status":"RE"}}`
	})

	resp, err := runOutput(runOutputRequest{
		Language: "cpp",
		Code:     "int",
		Tests:    []outputTest{{Expected: "1"}, {Expected: "2"}, {Expected: "3"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(resp.CompileError, "expected unqualified-id") {
		t.Errorf("compileError = %q", resp.CompileError)
	}
	if strings.Contains(resp.CompileError, "chmod") {
		t.Errorf("o ruido do chmod deveria ser removido: %q", resp.CompileError)
	}
	if resp.PassedCount != 0 || resp.Total != 3 || len(resp.Results) != 3 {
		t.Errorf("resposta inesperada: %+v", resp)
	}
	if fp.received != 1 {
		t.Errorf("com erro de compilacao so o primeiro teste deveria rodar, rodaram %d", fp.received)
	}
}

func TestRunOutputDetectsJavaCompileError(t *testing.T) {
	javaErr := "Main.java:3: error: ';' expected\n  int x = 1\n           ^\n1 error\nerror: compilation failed\n"
	fp := newFakePiston(t, func(req pistonRequest) string { return runResp("", javaErr, 1, "RE") })

	resp, err := runOutput(runOutputRequest{
		Language: "java",
		Code:     "class Main {}",
		Tests:    []outputTest{{Expected: "1"}, {Expected: "2"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(resp.CompileError, "';' expected") {
		t.Errorf("compileError = %q", resp.CompileError)
	}
	if fp.received != 1 {
		t.Errorf("deveria parar apos o primeiro teste, rodaram %d", fp.received)
	}
}

// Excecao em tempo de execucao NAO e erro de compilacao: cada teste roda e reprova sozinho.
func TestRunOutputJavaRuntimeExceptionIsNotCompileError(t *testing.T) {
	fp := newFakePiston(t, func(req pistonRequest) string {
		return runResp("", `Exception in thread "main" java.lang.ArithmeticException`, 1, "RE")
	})

	resp, err := runOutput(runOutputRequest{
		Language: "java",
		Code:     "class Main {}",
		Tests:    []outputTest{{Expected: "1"}, {Expected: "2"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if resp.CompileError != "" || fp.received != 2 {
		t.Errorf("excecao em runtime tratada como compilacao: %+v (execucoes: %d)", resp, fp.received)
	}
}

func TestRunOutputPropagatesPistonFailure(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "quebrou", http.StatusInternalServerError)
	}))
	defer srv.Close()
	old := pistonURL
	pistonURL = srv.URL
	defer func() { pistonURL = old }()

	_, err := runOutput(runOutputRequest{
		Language: "python",
		Code:     "print(1)",
		Tests:    []outputTest{{Expected: "1"}, {Expected: "1"}, {Expected: "1"}},
	})
	if err == nil {
		t.Fatal("falha do Piston deveria virar erro, nao reprovacao silenciosa")
	}
}

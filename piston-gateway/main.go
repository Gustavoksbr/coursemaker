// piston-gateway e um proxy fino e autenticado na frente do Piston. Ele existe porque o Piston
// em si nao tem nenhum mecanismo de autenticacao - qualquer requisicao bem formada que chegue na
// porta dele e executada. A estrategia aqui e simples: Piston nunca expoe porta publica (so
// alcancavel pela rede interna do Docker), e este gateway e a unica coisa que fala com a internet,
// protegido por um bearer token fixo compartilhado com o backend do CourseMaker.
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

type languageInfo struct {
	pistonLanguage string
	version        string
	fileName       string
}

// Mesma versoes instaladas no Piston local - ver README para o comando de instalacao. O campo
// "javascript" e o nome que o Piston espera em /execute; "node" (usado so em /packages) e algo
// diferente que confunde facil - ver README. C e C++ vem do mesmo pacote "gcc"; a chave "cpp" e
// a que o resto do CourseMaker usa, e o Piston a conhece como "c++".
var languages = map[string]languageInfo{
	"javascript": {"javascript", "20.11.1", "main.js"},
	"python":     {"python", "3.12.0", "main.py"},
	"java":       {"java", "15.0.2", "Main"}, // o Piston renomeia para Main.java na hora de rodar
	"c":          {"c", "10.2.0", "main"},    // o script de compilacao do Piston acrescenta .c / .cpp
	"cpp":        {"c++", "10.2.0", "main"},
}

type pistonFile struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

type pistonRequest struct {
	Language string       `json:"language"`
	Version  string       `json:"version"`
	Files    []pistonFile `json:"files"`
	Stdin    string       `json:"stdin"`
}

type pistonStage struct {
	Stdout string  `json:"stdout"`
	Stderr string  `json:"stderr"`
	Code   *int    `json:"code"`
	Status *string `json:"status"` // "TO" = tempo limite, "RE" = erro em execucao, etc.
}

type pistonResponse struct {
	Compile *pistonStage `json:"compile"`
	Run     *pistonStage `json:"run"`
}

type executeRequest struct {
	Language string `json:"language"`
	Code     string `json:"code"`
	Stdin    string `json:"stdin"`
}

type executeResponse struct {
	Stdout        string `json:"stdout"`
	Stderr        string `json:"stderr"`
	ExitCode      int    `json:"exitCode"`
	CompileOutput string `json:"compileOutput,omitempty"`
	TimedOut      bool   `json:"timedOut,omitempty"`
	// CompileFailed so vale para linguagens compiladas em etapa propria (C/C++): o programa nem
	// chegou a rodar e a mensagem do compilador esta em CompileOutput.
	CompileFailed bool `json:"compileFailed,omitempty"`
}

var (
	pistonURL  string
	authToken  string
	httpClient = &http.Client{Timeout: 15 * time.Second}
)

func main() {
	pistonURL = envOrDefault("PISTON_URL", "http://localhost:2000/api/v2")
	authToken = os.Getenv("AUTH_TOKEN")
	port := envOrDefault("PORT", "8081")

	if authToken == "" {
		log.Fatal("AUTH_TOKEN precisa estar configurado - sem ele qualquer um na internet executaria codigo de graca nesta maquina")
	}

	// RUNNER escolhe quem executa o codigo: "piston" (padrao) ou "docker" (conteiner efemero por execucao,
	// para onde o Piston nao roda, como ARM).
	executor := envOrDefault("RUNNER", "piston")
	switch executor {
	case "piston":
	case "docker":
		runner, err := newDockerRunner()
		if err != nil {
			log.Fatal(err)
		}
		docker = runner
		go docker.ensureImages()
	case "local":
		local = newLocalRunner()
	default:
		log.Fatalf("RUNNER invalido: %q (use piston, docker ou local)", executor)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/execute", withAuth(handleExecute))
	mux.HandleFunc("/run-tests", withAuth(handleRunTests))
	mux.HandleFunc("/run-output", withAuth(handleRunOutput))
	mux.HandleFunc("/exercises/square/run", withAuth(handleSquareExercise))
	mux.HandleFunc("/health", handleHealth)

	if executor == "docker" {
		log.Printf("piston-gateway ouvindo na porta %s (executor: conteineres Docker)", port)
	} else if executor == "local" {
		log.Printf("piston-gateway ouvindo na porta %s (executor: processos locais, LOG_DETAILS=%v)", port, logDetails)
	} else {
		log.Printf("piston-gateway ouvindo na porta %s (Piston em %s)", port, pistonURL)
	}
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// withAuth exige "Authorization: Bearer <AUTH_TOKEN>" - unico controle de acesso deste gateway.
func withAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		got := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if got == "" || got != authToken {
			http.Error(w, `{"message":"nao autorizado"}`, http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

// handleExecute e o equivalente ao playground livre: o usuario manda um programa completo
// (com main/print/console.log) e recebe stdout/stderr de volta, sem nenhuma validacao de resultado.
func handleExecute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"message":"metodo nao permitido"}`, http.StatusMethodNotAllowed)
		return
	}

	var req executeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"message":"corpo invalido"}`, http.StatusBadRequest)
		return
	}

	lang, ok := languages[req.Language]
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"message": fmt.Sprintf("linguagem nao suportada: %s", req.Language),
		})
		return
	}

	started := time.Now()
	result, err := runCode(lang, req.Code, req.Stdin)
	if err == nil {
		log.Printf("[execute] %s: codigo de saida %d em %d ms%s", req.Language, result.ExitCode, time.Since(started).Milliseconds(),
			map[bool]string{true: " (tempo limite)", false: ""}[result.TimedOut])
		if logDetails {
			log.Printf("  entrada=%s  stdout=%s  stderr=%s", short(req.Stdin), short(result.Stdout), short(result.Stderr))
		}
	} else {
		log.Printf("[execute] %s: falhou: %v", req.Language, err)
	}
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"message": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// handleSquareExercise e o primeiro exemplo do padrao "estilo LeetCode": o usuario so escreve a
// funcao (nao um programa inteiro). O gateway gera um numero aleatorio, monta um programinha que
// chama a funcao do usuario com esse numero, roda no Piston, e confere o resultado contra o valor
// esperado - calculado aqui mesmo, nunca confiando em nada que venha do lado do usuario.
func handleSquareExercise(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"message":"metodo nao permitido"}`, http.StatusMethodNotAllowed)
		return
	}

	var req executeRequest // reaproveita {language, code}; stdin nao se aplica aqui
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"message":"corpo invalido"}`, http.StatusBadRequest)
		return
	}

	if req.Language != "javascript" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"message": "este exercicio so suporta javascript por enquanto",
		})
		return
	}

	input := rand.Intn(100) + 1 // 1 a 100
	expected := input * input

	// O usuario escreve so "function square(n) { ... }" - a gente completa com a chamada.
	harness := fmt.Sprintf("%s\nconsole.log(square(%d))", req.Code, input)

	result, err := runCode(languages["javascript"], harness, "")
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"message": err.Error()})
		return
	}

	actualStr := strings.TrimSpace(result.Stdout)
	actual, parseErr := strconv.Atoi(actualStr)
	passed := parseErr == nil && actual == expected

	writeJSON(w, http.StatusOK, map[string]any{
		"input":    input,
		"expected": expected,
		"actual":   actualStr,
		"passed":   passed,
		"stderr":   result.Stderr,
		"exitCode": result.ExitCode,
	})
}

// runCode executa o codigo no executor escolhido por RUNNER. Todo o resto do gateway (harnesses,
// comparacao, limites) fala so com esta funcao e nao sabe quem roda o codigo.
func runCode(lang languageInfo, code string, stdin string) (*executeResponse, error) {
	if docker != nil {
		return docker.run(lang, code, stdin)
	}
	if local != nil {
		return local.run(lang, code, stdin)
	}
	return runOnPiston(lang, code, stdin)
}

func runOnPiston(lang languageInfo, code string, stdin string) (*executeResponse, error) {
	body := pistonRequest{
		Language: lang.pistonLanguage,
		Version:  lang.version,
		Files:    []pistonFile{{Name: lang.fileName, Content: code}},
		Stdin:    stdin,
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	resp, err := httpClient.Post(pistonURL+"/execute", "application/json", strings.NewReader(string(payload)))
	if err != nil {
		return nil, fmt.Errorf("piston indisponivel: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("piston respondeu %d: %s", resp.StatusCode, string(data))
	}

	var pResp pistonResponse
	if err := json.Unmarshal(data, &pResp); err != nil {
		return nil, err
	}
	// Com erro de compilacao o Piston devolve "compile" com codigo != 0 (e, nas versoes recentes,
	// um "run" que so repete a mesma mensagem) - o programa nunca chegou a executar.
	if c := pResp.Compile; c != nil && ((c.Code != nil && *c.Code != 0) || c.Status != nil) {
		code := 1
		if c.Code != nil && *c.Code != 0 {
			code = *c.Code
		}
		return &executeResponse{
			ExitCode:      code,
			CompileOutput: cleanCompilerOutput(firstNonEmpty(c.Stderr, c.Stdout)),
			CompileFailed: true,
			TimedOut:      c.Status != nil && *c.Status == "TO",
		}, nil
	}
	if pResp.Run == nil {
		return nil, fmt.Errorf("piston nao retornou resultado de execucao")
	}

	exitCode := 0
	if pResp.Run.Code != nil {
		exitCode = *pResp.Run.Code
	}

	compileOutput := ""
	if pResp.Compile != nil {
		compileOutput = cleanCompilerOutput(pResp.Compile.Stderr)
	}

	return &executeResponse{
		Stdout:        pResp.Run.Stdout,
		Stderr:        pResp.Run.Stderr,
		ExitCode:      exitCode,
		CompileOutput: compileOutput,
		TimedOut:      pResp.Run.Status != nil && *pResp.Run.Status == "TO",
	}, nil
}

// cleanCompilerOutput tira o ruido que o script de compilacao do Piston (gcc) acrescenta depois do
// erro de verdade: o "chmod" final falha porque nao existe executavel, o que nao ajuda o aluno.
func cleanCompilerOutput(s string) string {
	var kept []string
	for _, line := range strings.Split(s, "\n") {
		if strings.HasPrefix(line, "chmod: cannot access 'a.out'") {
			continue
		}
		kept = append(kept, line)
	}
	return strings.Join(kept, "\n")
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

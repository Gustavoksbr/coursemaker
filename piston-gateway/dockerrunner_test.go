package main

import (
	"archive/tar"
	"bytes"
	"encoding/binary"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeDocker simula so o que o executor usa da API do Docker, e guarda o que recebeu.
type fakeDocker struct {
	mu          sync.Mutex
	createBody  map[string]any
	files       map[string]string // nome dentro do tar -> conteudo
	removed     bool
	killed      bool
	exitCode    int
	blockOnWait bool // so responde ao wait depois do kill (simula laco infinito)
	oom         bool
	stdout      string
	stderr      string
	createCode  int // 0 = 201
	killedCh    chan struct{}
}

func newFakeDocker(t *testing.T) (*fakeDocker, *dockerRunner) {
	t.Helper()
	fd := &fakeDocker{files: map[string]string{}, killedCh: make(chan struct{})}

	mux := http.NewServeMux()
	mux.HandleFunc("/containers/create", func(w http.ResponseWriter, r *http.Request) {
		fd.mu.Lock()
		defer fd.mu.Unlock()
		if fd.createCode != 0 {
			w.WriteHeader(fd.createCode)
			w.Write([]byte(`{"message":"No such image: x"}`))
			return
		}
		json.NewDecoder(r.Body).Decode(&fd.createBody)
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"Id":"abc123"}`))
	})
	mux.HandleFunc("/containers/abc123/archive", func(w http.ResponseWriter, r *http.Request) {
		tr := tar.NewReader(r.Body)
		fd.mu.Lock()
		defer fd.mu.Unlock()
		for {
			hdr, err := tr.Next()
			if err != nil {
				break
			}
			content, _ := io.ReadAll(tr)
			fd.files[hdr.Name] = string(content)
		}
	})
	mux.HandleFunc("/containers/abc123/start", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) })
	mux.HandleFunc("/containers/abc123/wait", func(w http.ResponseWriter, r *http.Request) {
		if fd.blockOnWait {
			select {
			case <-fd.killedCh:
			case <-r.Context().Done():
				return
			}
		}
		w.Write([]byte(`{"StatusCode":` + itoa(fd.exitCode) + `}`))
	})
	mux.HandleFunc("/containers/abc123/kill", func(w http.ResponseWriter, r *http.Request) {
		fd.mu.Lock()
		if !fd.killed {
			fd.killed = true
			close(fd.killedCh)
		}
		fd.mu.Unlock()
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("/containers/abc123/logs", func(w http.ResponseWriter, r *http.Request) {
		w.Write(frame(1, fd.stdout))
		w.Write(frame(2, fd.stderr))
	})
	mux.HandleFunc("/containers/abc123/json", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"State":{"OOMKilled":` + map[bool]string{true: "true", false: "false"}[fd.oom] + `}}`))
	})
	mux.HandleFunc("/containers/abc123", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			fd.mu.Lock()
			fd.removed = true
			fd.mu.Unlock()
			w.WriteHeader(http.StatusNoContent)
		}
	})

	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return fd, &dockerRunner{base: srv.URL, client: srv.Client(), slots: make(chan struct{}, 2)}
}

func itoa(n int) string { b, _ := json.Marshal(n); return string(b) }

// frame monta um quadro do fluxo de logs: tipo, 3 zeros, tamanho e conteudo.
func frame(kind byte, s string) []byte {
	header := make([]byte, 8)
	header[0] = kind
	binary.BigEndian.PutUint32(header[4:], uint32(len(s)))
	return append(header, s...)
}

func TestDockerRunnerRunsInARestrictedContainer(t *testing.T) {
	fd, runner := newFakeDocker(t)
	fd.stdout = "5\n"

	res, err := runner.run(languages["python"], "print(2+3)", "2 3\n")
	if err != nil {
		t.Fatal(err)
	}
	if res.Stdout != "5\n" || res.ExitCode != 0 || res.TimedOut {
		t.Errorf("resposta inesperada: %+v", res)
	}

	// O codigo e a entrada chegam por upload, em /work.
	if fd.files["work/main.py"] != "print(2+3)" || fd.files["work/stdin.txt"] != "2 3\n" {
		t.Errorf("arquivos enviados: %v", fd.files)
	}
	if !fd.removed {
		t.Error("o conteiner deveria ser apagado no fim")
	}

	// As restricoes de seguranca estao no pedido de criacao.
	host, _ := fd.createBody["HostConfig"].(map[string]any)
	if host["NetworkMode"] != "none" {
		t.Errorf("o conteiner deveria ficar sem rede: %v", host["NetworkMode"])
	}
	if caps, _ := host["CapDrop"].([]any); len(caps) != 1 || caps[0] != "ALL" {
		t.Errorf("CapDrop = %v", host["CapDrop"])
	}
	if opts, _ := host["SecurityOpt"].([]any); len(opts) != 1 || opts[0] != "no-new-privileges" {
		t.Errorf("SecurityOpt = %v", host["SecurityOpt"])
	}
	if host["PidsLimit"].(float64) != dockerPidsLimit {
		t.Errorf("PidsLimit = %v", host["PidsLimit"])
	}
	if host["Memory"] != host["MemorySwap"] {
		t.Errorf("Memory e MemorySwap deveriam ser iguais (sem swap): %v / %v", host["Memory"], host["MemorySwap"])
	}
	if fd.createBody["User"] != "65534:65534" {
		t.Errorf("User = %v", fd.createBody["User"])
	}
	if fd.createBody["NetworkDisabled"] != true {
		t.Error("NetworkDisabled deveria ser true")
	}
	if fd.createBody["Image"] != "python:3.12-alpine" {
		t.Errorf("Image = %v", fd.createBody["Image"])
	}
}

func TestDockerRunnerReportsRuntimeErrors(t *testing.T) {
	fd, runner := newFakeDocker(t)
	fd.exitCode = 1
	fd.stderr = "Traceback...\nZeroDivisionError\n"

	res, err := runner.run(languages["python"], "1/0", "")
	if err != nil {
		t.Fatal(err)
	}
	if res.ExitCode != 1 || !strings.Contains(res.Stderr, "ZeroDivisionError") {
		t.Errorf("resposta inesperada: %+v", res)
	}
}

func TestDockerRunnerSeparatesCompileFailures(t *testing.T) {
	fd, runner := newFakeDocker(t)
	fd.exitCode = compileExitCode
	fd.stderr = "main.cpp:1:14: error: expected ';'\nchmod: cannot access 'a.out': No such file or directory\n"

	res, err := runner.run(languages["cpp"], "int main() {", "")
	if err != nil {
		t.Fatal(err)
	}
	if !res.CompileFailed || !strings.Contains(res.CompileOutput, "expected ';'") {
		t.Errorf("deveria ser falha de compilacao: %+v", res)
	}
	if strings.Contains(res.CompileOutput, "chmod") {
		t.Errorf("o ruido do chmod deveria sair: %q", res.CompileOutput)
	}
	if res.Stdout != "" {
		t.Errorf("sem execucao nao ha stdout: %q", res.Stdout)
	}

	// Em linguagem interpretada o mesmo codigo de saida e so um programa que terminou com 111.
	fd2, runner2 := newFakeDocker(t)
	fd2.exitCode = compileExitCode
	res2, err := runner2.run(languages["python"], "import sys; sys.exit(111)", "")
	if err != nil {
		t.Fatal(err)
	}
	if res2.CompileFailed {
		t.Error("python nao tem etapa de compilacao")
	}
}

func TestDockerRunnerKillsOnTimeout(t *testing.T) {
	fd, runner := newFakeDocker(t)
	fd.blockOnWait = true
	fd.exitCode = 137

	spec := dockerSpecs["python"]
	short := spec
	short.timeout = 300 * time.Millisecond
	dockerSpecs["python"] = short
	defer func() { dockerSpecs["python"] = spec }()

	start := time.Now()
	res, err := runner.run(languages["python"], "while True: pass", "")
	if err != nil {
		t.Fatal(err)
	}
	if !res.TimedOut {
		t.Errorf("deveria marcar timedOut: %+v", res)
	}
	if !fd.killed {
		t.Error("o conteiner deveria ser morto ao estourar o tempo")
	}
	if time.Since(start) > 5*time.Second {
		t.Errorf("demorou demais para abortar: %v", time.Since(start))
	}
	if !fd.removed {
		t.Error("o conteiner deveria ser apagado mesmo apos o timeout")
	}
}

func TestDockerRunnerReportsOutOfMemory(t *testing.T) {
	fd, runner := newFakeDocker(t)
	fd.exitCode = 137
	fd.oom = true

	res, err := runner.run(languages["java"], "class Main {}", "")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(res.Stderr, "Memoria excedida") {
		t.Errorf("stderr = %q", res.Stderr)
	}
}

func TestDockerRunnerFailsLoudlyWhenTheImageIsMissing(t *testing.T) {
	fd, runner := newFakeDocker(t)
	fd.createCode = http.StatusNotFound

	if _, err := runner.run(languages["python"], "print(1)", ""); err == nil || !strings.Contains(err.Error(), "No such image") {
		t.Fatalf("erro deveria vir do docker: %v", err)
	}
}

func TestDemuxLogs(t *testing.T) {
	data := append(frame(1, "ola "), frame(2, "erro")...)
	data = append(data, frame(1, "mundo")...)
	out, errOut := demuxLogs(data)
	if out != "ola mundo" || errOut != "erro" {
		t.Errorf("stdout=%q stderr=%q", out, errOut)
	}

	// Um quadro cortado no fim nao derruba nada.
	cut := frame(1, "abcdef")[:11]
	out, _ = demuxLogs(cut)
	if out != "abc" {
		t.Errorf("quadro cortado: %q", out)
	}
	if o, e := demuxLogs(nil); o != "" || e != "" {
		t.Error("entrada vazia deveria dar vazio")
	}
}

func TestBuildArchive(t *testing.T) {
	data, err := buildArchive("Main.java", "class Main {}", "x")
	if err != nil {
		t.Fatal(err)
	}
	tr := tar.NewReader(bytes.NewReader(data))
	got := map[string]string{}
	for {
		hdr, err := tr.Next()
		if err != nil {
			break
		}
		content, _ := io.ReadAll(tr)
		got[hdr.Name] = string(content)
	}
	if got["work/Main.java"] != "class Main {}" || got["work/stdin.txt"] != "x" {
		t.Errorf("tar = %v", got)
	}
	if _, ok := got["work/"]; !ok {
		t.Error("faltou o diretorio /work")
	}
}

func TestEveryLanguageHasADockerSpec(t *testing.T) {
	for key, lang := range languages {
		if pistonOnlyLanguages[key] {
			continue
		}
		spec, ok := dockerSpecs[lang.pistonLanguage]
		if !ok {
			t.Errorf("a linguagem %s nao tem dockerSpec", key)
			continue
		}
		if spec.image == "" || spec.file == "" || spec.command == "" || spec.timeout <= 0 {
			t.Errorf("dockerSpec incompleto para %s: %+v", key, spec)
		}
		if !strings.Contains(spec.command, "stdin.txt") {
			t.Errorf("o comando de %s nao le a entrada: %s", key, spec.command)
		}
	}
}

func TestSplitImage(t *testing.T) {
	cases := map[string][2]string{
		"node:20-alpine":                {"node", "20-alpine"},
		"coursemaker/runner-c:alpine":   {"coursemaker/runner-c", "alpine"},
		"localhost:5000/img":            {"localhost:5000/img", "latest"},
		"localhost:5000/img:1.0":        {"localhost:5000/img", "1.0"},
		"eclipse-temurin:21-jdk-alpine": {"eclipse-temurin", "21-jdk-alpine"},
	}
	for in, want := range cases {
		if name, tag := splitImage(in); name != want[0] || tag != want[1] {
			t.Errorf("splitImage(%q) = %q, %q", in, name, tag)
		}
	}
}

func TestNewDockerRunnerReadsTheEnvironment(t *testing.T) {
	t.Setenv("DOCKER_HOST", "tcp://127.0.0.1:2375")
	t.Setenv("DOCKER_MAX_PARALLEL", "7")
	runner, err := newDockerRunner()
	if err != nil {
		t.Fatal(err)
	}
	if runner.base != "http://127.0.0.1:2375" || cap(runner.slots) != 7 {
		t.Errorf("base=%s paralelo=%d", runner.base, cap(runner.slots))
	}

	t.Setenv("DOCKER_HOST", "ftp://x")
	if _, err := newDockerRunner(); err == nil {
		t.Error("esquema invalido deveria dar erro")
	}

	t.Setenv("DOCKER_HOST", "unix:///var/run/docker.sock")
	t.Setenv("DOCKER_MAX_PARALLEL", "")
	runner, err = newDockerRunner()
	if err != nil || cap(runner.slots) != 4 {
		t.Errorf("padrao: err=%v paralelo=%d", err, cap(runner.slots))
	}
}

func TestRunCodeUsesTheDockerRunnerWhenEnabled(t *testing.T) {
	fd, runner := newFakeDocker(t)
	fd.stdout = "docker\n"
	docker = runner
	defer func() { docker = nil }()

	res, err := runCode(languages["python"], "print('docker')", "")
	if err != nil || res.Stdout != "docker\n" {
		t.Fatalf("res=%+v err=%v", res, err)
	}
}

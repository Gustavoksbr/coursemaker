package main

import (
	"archive/tar"
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// Executor alternativo ao Piston: cada execucao roda num conteiner Docker efemero, a partir de imagens
// oficiais multi-arquitetura (node, python, eclipse-temurin...). Serve onde o Piston nao roda - o caso
// que motivou isto e o Ampere A1 (ARM) do Oracle Always Free, porque os pacotes de linguagem do Piston
// sao binarios x86. Escolha com RUNNER=docker (o padrao continua sendo RUNNER=piston).
//
// Como cada execucao e isolada:
//   - sem rede (NetworkMode none), sem capabilities, no-new-privileges, usuario sem privilegio;
//   - limite de memoria (sem swap), de CPU, de processos (bomba de fork) e de tamanho de arquivo;
//   - /tmp e um tmpfs pequeno; o resto do sistema de arquivos so e legivel;
//   - tempo maximo por execucao: passou, o conteiner e morto;
//   - o codigo entra por upload (PUT /archive) e nao por pasta do host, entao nao ha caminho em comum
//     entre execucoes simultaneas nem nome de arquivo vindo do aluno.
//
// ATENCAO: quem fala com o socket do Docker pode criar um conteiner privilegiado e virar root na maquina.
// Um proxy de socket filtra por endpoint, nao pelo corpo do pedido, entao nao impede isso. O mais seguro
// e apontar DOCKER_HOST para um daemon rootless dedicado (veja o README).

const (
	// compileExitCode e o que o script de compilacao devolve quando o compilador falha, para o
	// gateway separar "nao compilou" de "o programa terminou com erro".
	compileExitCode = 111

	dockerMemoryBytes = 512 << 20
	dockerPidsLimit   = 128
	dockerNanoCPUs    = 1_000_000_000
	dockerFileLimit   = 10 << 20 // maior arquivo que o programa pode escrever
	maxLogBytes       = 512 << 10
	maxStreamBytes    = 64 << 10
)

// pistonOnlyLanguages sao as linguagens que so rodam com RUNNER=piston: o executor Docker e o local
// cobrem JavaScript, Python, Java, C e C++ (imagens leves, e a Render nem tem como instalar o resto).
var pistonOnlyLanguages = map[string]bool{
	"typescript": true, "php": true, "csharp": true, "go": true, "rust": true, "ruby": true, "kotlin": true,
}

// dockerSpec diz como rodar uma linguagem. A chave de dockerSpecs e languageInfo.pistonLanguage.
type dockerSpec struct {
	image string
	file  string // nome do arquivo do codigo, dentro de /work
	// command roda dentro de `sh -c`, em /work. A entrada do teste esta em /work/stdin.txt.
	command  string
	compiled bool // a compilacao esta no command e sai com compileExitCode se falhar
	timeout  time.Duration
}

var dockerSpecs = map[string]dockerSpec{
	"javascript": {
		image:   "node:20-alpine",
		file:    "main.js",
		command: "node main.js < stdin.txt",
		timeout: 5 * time.Second,
	},
	"python": {
		image:   "python:3.12-alpine",
		file:    "main.py",
		command: "python main.py < stdin.txt",
		timeout: 5 * time.Second,
	},
	// O launcher de fonte unico do Java compila e roda no mesmo comando; o erro de compilacao termina
	// com "error: compilation failed" (tratado fora daqui, como no Piston).
	"java": {
		image:   "eclipse-temurin:21-jdk-alpine",
		file:    "Main.java",
		command: "java -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xmx256m Main.java < stdin.txt",
		timeout: 10 * time.Second,
	},
	// C e C++ usam uma imagem pequena propria (alpine + build-base): veja runner-images/c.
	"c": {
		image:    "coursemaker/runner-c:alpine",
		file:     "main.c",
		command:  "gcc -std=c11 -O1 -o /tmp/main main.c -lm 2>/tmp/cc.txt || { cat /tmp/cc.txt >&2; exit 111; }; /tmp/main < stdin.txt",
		compiled: true,
		timeout:  10 * time.Second,
	},
	"c++": {
		image:    "coursemaker/runner-c:alpine",
		file:     "main.cpp",
		command:  "g++ -std=c++17 -O1 -o /tmp/main main.cpp 2>/tmp/cc.txt || { cat /tmp/cc.txt >&2; exit 111; }; /tmp/main < stdin.txt",
		compiled: true,
		timeout:  10 * time.Second,
	},
}

// dockerRunner fala com a API do Docker Engine (HTTP sobre socket unix ou tcp).
type dockerRunner struct {
	base   string // ex.: http://docker
	client *http.Client
	slots  chan struct{} // limita quantos conteineres rodam ao mesmo tempo
}

var docker *dockerRunner

// newDockerRunner le DOCKER_HOST ("unix:///var/run/docker.sock" por padrao, ou "tcp://host:porta") e
// DOCKER_MAX_PARALLEL (4 por padrao).
func newDockerRunner() (*dockerRunner, error) {
	host := envOrDefault("DOCKER_HOST", "unix:///var/run/docker.sock")
	u, err := url.Parse(host)
	if err != nil {
		return nil, fmt.Errorf("DOCKER_HOST invalido: %w", err)
	}

	transport := &http.Transport{}
	var base string
	switch u.Scheme {
	case "unix":
		path := u.Path
		transport.DialContext = func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", path)
		}
		base = "http://docker"
	case "tcp", "http":
		base = "http://" + u.Host
	default:
		return nil, fmt.Errorf("DOCKER_HOST com esquema nao suportado: %s", u.Scheme)
	}

	parallel := 4
	if v, err := strconv.Atoi(os.Getenv("DOCKER_MAX_PARALLEL")); err == nil && v > 0 {
		parallel = v
	}
	return &dockerRunner{
		base:   base,
		client: &http.Client{Transport: transport},
		slots:  make(chan struct{}, parallel),
	}, nil
}

// api faz uma chamada JSON/bytes na API do Docker; devolve status e corpo.
func (d *dockerRunner) api(ctx context.Context, method, path string, body io.Reader, contentType string) (int, []byte, error) {
	req, err := http.NewRequestWithContext(ctx, method, d.base+path, body)
	if err != nil {
		return 0, nil, err
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	resp, err := d.client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxLogBytes+4096))
	return resp.StatusCode, data, err
}

// ensureImages baixa, uma vez e em segundo plano, as imagens que ainda nao existem localmente.
func (d *dockerRunner) ensureImages() {
	seen := map[string]bool{}
	for _, spec := range dockerSpecs {
		if seen[spec.image] {
			continue
		}
		seen[spec.image] = true

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		if status, _, err := d.api(ctx, http.MethodGet, "/images/"+spec.image+"/json", nil, ""); err == nil && status == http.StatusOK {
			cancel()
			continue
		}
		name, tag := splitImage(spec.image)
		log.Printf("baixando a imagem %s...", spec.image)
		status, body, err := d.api(ctx, http.MethodPost,
			"/images/create?fromImage="+url.QueryEscape(name)+"&tag="+url.QueryEscape(tag), nil, "")
		cancel()
		if err != nil || status != http.StatusOK {
			log.Printf("nao foi possivel baixar %s (status %d, erro %v): %s", spec.image, status, err, firstLine(string(body)))
		}
	}
}

func splitImage(image string) (name, tag string) {
	if i := strings.LastIndex(image, ":"); i > strings.LastIndex(image, "/") {
		return image[:i], image[i+1:]
	}
	return image, "latest"
}

func firstLine(s string) string {
	s = strings.TrimSpace(s)
	if i := strings.IndexByte(s, '\n'); i >= 0 {
		return s[:i]
	}
	return s
}

// run executa `code` na linguagem `lang` e devolve o mesmo formato do executor do Piston.
func (d *dockerRunner) run(lang languageInfo, code, stdin string) (*executeResponse, error) {
	spec, ok := dockerSpecs[lang.pistonLanguage]
	if !ok {
		return nil, fmt.Errorf("linguagem sem imagem Docker configurada: %s (esta linguagem so roda com RUNNER=piston)", lang.pistonLanguage)
	}

	d.slots <- struct{}{}
	defer func() { <-d.slots }()

	// A execucao tem o seu tempo, mais uma folga para criar, enviar o codigo e ler os logs.
	ctx, cancel := context.WithTimeout(context.Background(), spec.timeout+30*time.Second)
	defer cancel()

	id, err := d.create(ctx, spec)
	if err != nil {
		return nil, err
	}
	defer d.remove(id)

	archive, err := buildArchive(spec.file, code, stdin)
	if err != nil {
		return nil, err
	}
	if status, body, err := d.api(ctx, http.MethodPut, "/containers/"+id+"/archive?path=/", bytes.NewReader(archive), "application/x-tar"); err != nil || status != http.StatusOK {
		return nil, fmt.Errorf("falha ao enviar o codigo ao conteiner (status %d, erro %v): %s", status, err, firstLine(string(body)))
	}
	if status, body, err := d.api(ctx, http.MethodPost, "/containers/"+id+"/start", nil, ""); err != nil || (status != http.StatusNoContent && status != http.StatusNotModified) {
		return nil, fmt.Errorf("falha ao iniciar o conteiner (status %d, erro %v): %s", status, err, firstLine(string(body)))
	}

	exitCode, timedOut, err := d.wait(ctx, id, spec.timeout)
	if err != nil {
		return nil, err
	}

	stdout, stderr := d.logs(ctx, id)
	oom := d.oomKilled(ctx, id)

	if oom {
		stderr += "\nMemoria excedida (limite de " + strconv.Itoa(dockerMemoryBytes>>20) + " MB).\n"
	}

	if spec.compiled && exitCode == compileExitCode && !timedOut {
		return &executeResponse{
			ExitCode:      exitCode,
			CompileOutput: cleanCompilerOutput(stderr),
			CompileFailed: true,
		}, nil
	}

	return &executeResponse{
		Stdout:   capStream(stdout),
		Stderr:   capStream(stderr),
		ExitCode: exitCode,
		TimedOut: timedOut,
	}, nil
}

// create cria o conteiner (ainda parado) com todas as restricoes.
func (d *dockerRunner) create(ctx context.Context, spec dockerSpec) (string, error) {
	body := map[string]any{
		"Image":           spec.image,
		"Cmd":             []string{"sh", "-c", spec.command},
		"WorkingDir":      "/work",
		"User":            "65534:65534", // nobody
		"Env":             []string{"HOME=/tmp"},
		"NetworkDisabled": true,
		"HostConfig": map[string]any{
			"NetworkMode":     "none",
			"Memory":          dockerMemoryBytes,
			"MemorySwap":      dockerMemoryBytes, // igual a Memory: sem swap
			"NanoCpus":        dockerNanoCPUs,
			"PidsLimit":       dockerPidsLimit,
			"CapDrop":         []string{"ALL"},
			"SecurityOpt":     []string{"no-new-privileges"},
			"Tmpfs":           map[string]string{"/tmp": "rw,exec,nosuid,size=64m"},
			"Ulimits":         []map[string]any{{"Name": "fsize", "Soft": dockerFileLimit, "Hard": dockerFileLimit}, {"Name": "nofile", "Soft": 256, "Hard": 256}},
			"AutoRemove":      false,
			"PublishAllPorts": false,
		},
	}
	payload, _ := json.Marshal(body)
	status, data, err := d.api(ctx, http.MethodPost, "/containers/create", bytes.NewReader(payload), "application/json")
	if err != nil {
		return "", fmt.Errorf("docker indisponivel: %w", err)
	}
	if status != http.StatusCreated {
		return "", fmt.Errorf("falha ao criar o conteiner (status %d): %s", status, firstLine(string(data)))
	}
	var created struct {
		ID string `json:"Id"`
	}
	if err := json.Unmarshal(data, &created); err != nil || created.ID == "" {
		return "", fmt.Errorf("resposta inesperada do docker ao criar o conteiner")
	}
	return created.ID, nil
}

// wait espera o conteiner terminar; se passar de `limit`, mata e marca timedOut.
func (d *dockerRunner) wait(ctx context.Context, id string, limit time.Duration) (exitCode int, timedOut bool, err error) {
	waitCtx, cancel := context.WithTimeout(ctx, limit)
	defer cancel()

	status, data, err := d.api(waitCtx, http.MethodPost, "/containers/"+id+"/wait?condition=not-running", nil, "")
	if err == nil && status == http.StatusOK {
		var result struct {
			StatusCode int `json:"StatusCode"`
		}
		if json.Unmarshal(data, &result) == nil {
			return result.StatusCode, false, nil
		}
	}
	if waitCtx.Err() == nil {
		return 0, false, fmt.Errorf("falha ao esperar o conteiner (status %d, erro %v)", status, err)
	}

	// Estourou o tempo: mata e le o codigo de saida que o Docker registrou.
	killCtx, killCancel := context.WithTimeout(ctx, 10*time.Second)
	defer killCancel()
	d.api(killCtx, http.MethodPost, "/containers/"+id+"/kill", nil, "")
	if status, data, err := d.api(killCtx, http.MethodPost, "/containers/"+id+"/wait?condition=not-running", nil, ""); err == nil && status == http.StatusOK {
		var result struct {
			StatusCode int `json:"StatusCode"`
		}
		if json.Unmarshal(data, &result) == nil {
			return result.StatusCode, true, nil
		}
	}
	return 137, true, nil
}

// logs devolve stdout e stderr (o Docker os entrega intercalados, em quadros).
func (d *dockerRunner) logs(ctx context.Context, id string) (stdout, stderr string) {
	status, data, err := d.api(ctx, http.MethodGet, "/containers/"+id+"/logs?stdout=1&stderr=1", nil, "")
	if err != nil || status != http.StatusOK {
		return "", ""
	}
	return demuxLogs(data)
}

func (d *dockerRunner) oomKilled(ctx context.Context, id string) bool {
	status, data, err := d.api(ctx, http.MethodGet, "/containers/"+id+"/json", nil, "")
	if err != nil || status != http.StatusOK {
		return false
	}
	var info struct {
		State struct {
			OOMKilled bool `json:"OOMKilled"`
		} `json:"State"`
	}
	return json.Unmarshal(data, &info) == nil && info.State.OOMKilled
}

// remove apaga o conteiner (e seus volumes anonimos) sem depender do contexto da execucao.
func (d *dockerRunner) remove(id string) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if status, _, err := d.api(ctx, http.MethodDelete, "/containers/"+id+"?force=true&v=true", nil, ""); err != nil || status >= 300 {
		log.Printf("nao foi possivel apagar o conteiner %s (status %d, erro %v)", id, status, err)
	}
}

// buildArchive monta o tar que cria /work com o codigo e a entrada. Fica tudo de leitura para todos.
func buildArchive(file, code, stdin string) ([]byte, error) {
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	now := time.Now()

	if err := tw.WriteHeader(&tar.Header{Name: "work/", Typeflag: tar.TypeDir, Mode: 0o755, ModTime: now}); err != nil {
		return nil, err
	}
	for _, f := range []struct{ name, content string }{{file, code}, {"stdin.txt", stdin}} {
		if err := tw.WriteHeader(&tar.Header{Name: "work/" + f.name, Typeflag: tar.TypeReg, Mode: 0o644, Size: int64(len(f.content)), ModTime: now}); err != nil {
			return nil, err
		}
		if _, err := tw.Write([]byte(f.content)); err != nil {
			return nil, err
		}
	}
	if err := tw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// demuxLogs separa os quadros do fluxo de logs do Docker: 8 bytes de cabecalho (tipo, 3 zeros,
// tamanho em 4 bytes big-endian) e depois o conteudo. Um quadro cortado no fim e ignorado.
func demuxLogs(data []byte) (stdout, stderr string) {
	var out, errBuf strings.Builder
	for len(data) >= 8 {
		kind := data[0]
		size := int(binary.BigEndian.Uint32(data[4:8]))
		data = data[8:]
		if size > len(data) {
			size = len(data)
		}
		switch kind {
		case 1:
			out.Write(data[:size])
		case 2:
			errBuf.Write(data[:size])
		}
		data = data[size:]
	}
	return out.String(), errBuf.String()
}

// capStream limita o que volta de cada fluxo, no mesmo espirito do PISTON_OUTPUT_MAX_SIZE.
func capStream(s string) string {
	if len(s) <= maxStreamBytes {
		return s
	}
	return truncateAt(s, maxStreamBytes) + "\n... (saida truncada)"
}

// truncateAt corta em n bytes sem partir um caractere UTF-8 ao meio.
func truncateAt(s string, n int) string {
	for n > 0 && n < len(s) && s[n]&0xC0 == 0x80 {
		n--
	}
	return s[:n]
}

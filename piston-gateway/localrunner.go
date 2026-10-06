package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// Executor "local" (RUNNER=local): roda o codigo como um processo comum DENTRO do proprio conteiner do
// gateway. Existe para plataformas que nao dao Docker nem conteiner privilegiado (ex.: Render), onde nem
// o Piston nem o executor Docker funcionam. O gateway comeca como root, o codigo do aluno roda como
// "nobody" (uid 65534), num diretorio temporario proprio, com ambiente limpo (sem AUTH_TOKEN), limites de
// arquivo/processos, tempo maximo e saida limitada.
//
// O QUE ESTE EXECUTOR NAO FAZ: nao isola a rede (o codigo do aluno consegue abrir conexoes) e nao limita
// memoria alem do que cada runtime aceita por flag. E adequado para testar, nao para alunos de verdade.

const (
	maxLocalOutput = 64 << 10
	// maxQueueWait: quanto um pedido espera por uma vaga. Passou disso, devolve erro em vez de ficar
	// pendurado (e de acumular fila de clientes que ja desistiram).
	maxQueueWait = 20 * time.Second
)

type localRunner struct {
	slots chan struct{}
}

var local *localRunner

func newLocalRunner() *localRunner {
	parallel := 2
	if v, err := strconv.Atoi(os.Getenv("LOCAL_MAX_PARALLEL")); err == nil && v > 0 {
		parallel = v
	}
	return &localRunner{slots: make(chan struct{}, parallel)}
}

// limitedBuffer guarda no maximo `max` bytes e descarta o resto sem dar erro (um erro de escrita
// mataria o programa do aluno com SIGPIPE, e queremos so cortar a saida).
type limitedBuffer struct {
	data      []byte
	max       int
	truncated bool
}

func (b *limitedBuffer) Write(p []byte) (int, error) {
	room := b.max - len(b.data)
	if room > 0 {
		if len(p) > room {
			b.data = append(b.data, p[:room]...)
			b.truncated = true
		} else {
			b.data = append(b.data, p...)
		}
	} else if len(p) > 0 {
		b.truncated = true
	}
	return len(p), nil
}

func (b *limitedBuffer) String() string {
	s := string(b.data)
	if b.truncated {
		s = truncateAt(s, len(s)) + "\n... (saida truncada)"
	}
	return s
}

// localCommand adapta o comando da receita Docker (que usa /tmp/ e o diretorio /work) para rodar no
// diretorio temporario da execucao.
func localCommand(command string) string {
	return strings.ReplaceAll(command, "/tmp/", "./")
}

// localMemoryLimit e o teto de memoria (RSS somado) por execucao; LOCAL_MEMORY_MB muda o padrao de 350.
func localMemoryLimit() int64 {
	if v, err := strconv.Atoi(os.Getenv("LOCAL_MEMORY_MB")); err == nil && v > 0 {
		return int64(v) << 20
	}
	return 350 << 20
}

func (l *localRunner) run(lang languageInfo, code, stdin string) (*executeResponse, error) {
	spec, ok := dockerSpecs[lang.pistonLanguage]
	if !ok {
		return nil, fmt.Errorf("linguagem sem receita de execucao: %s", lang.pistonLanguage)
	}

	select {
	case l.slots <- struct{}{}:
		defer func() { <-l.slots }()
	case <-time.After(maxQueueWait):
		return nil, fmt.Errorf("o executor esta ocupado no momento, tente de novo em instantes")
	}

	dir, err := os.MkdirTemp("", "run-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)

	for name, content := range map[string]string{spec.file: code, "stdin.txt": stdin} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644); err != nil {
			return nil, err
		}
	}
	if err := handOverTo(dir); err != nil {
		return nil, err
	}

	// ulimit -t: o proprio kernel mata quem consumir CPU demais, sem depender do gateway ser escalonado.
	script := "ulimit -t 25; ulimit -f 10240; ulimit -n 256; ulimit -u 512; " + localCommand(spec.command)
	// nice 19: com CPU escassa (plano gratuito), o gateway sempre tem prioridade sobre o codigo do aluno,
	// entao um laco infinito nao o deixa sem tempo para matar o processo.
	cmd := exec.Command("nice", "-n", "19", "sh", "-c", script)
	cmd.Dir = dir
	cmd.Env = []string{
		"PATH=" + os.Getenv("PATH"),
		"HOME=" + dir,
		"TMPDIR=" + dir,
		"LANG=C.UTF-8",
		"NODE_OPTIONS=--max-old-space-size=200",
	}
	stdout := &limitedBuffer{max: maxLocalOutput}
	stderr := &limitedBuffer{max: maxLocalOutput}
	cmd.Stdout, cmd.Stderr = stdout, stderr
	isolate(cmd)

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("nao foi possivel iniciar o processo: %w", err)
	}
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()

	// Vigia: mata o grupo se estourar o tempo ou a memoria (soma do RSS de todos os processos dele).
	timedOut, outOfMemory := false, false
	deadline := time.After(spec.timeout)
	tick := time.NewTicker(150 * time.Millisecond)
	defer tick.Stop()
watch:
	for {
		select {
		case <-done:
			break watch
		case <-deadline:
			timedOut = true
			killGroup(cmd)
			<-done
			break watch
		case <-tick.C:
			if groupRSS(cmd.Process.Pid) > localMemoryLimit() {
				outOfMemory = true
				killGroup(cmd)
				<-done
				break watch
			}
		}
	}

	exitCode := 0
	if cmd.ProcessState != nil {
		exitCode = cmd.ProcessState.ExitCode()
		if exitCode < 0 { // morto por sinal
			exitCode = 137
		}
	}

	if outOfMemory {
		stderr.Write([]byte("\nMemoria excedida (limite de " + strconv.FormatInt(localMemoryLimit()>>20, 10) + " MB).\n"))
	}

	if spec.compiled && exitCode == compileExitCode && !timedOut && !outOfMemory {
		return &executeResponse{
			ExitCode:      exitCode,
			CompileOutput: cleanCompilerOutput(stderr.String()),
			CompileFailed: true,
		}, nil
	}
	return &executeResponse{
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
		ExitCode: exitCode,
		TimedOut: timedOut,
	}, nil
}

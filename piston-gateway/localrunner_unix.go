//go:build !windows

package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
)

const nobody = 65534

// isolate coloca o processo num grupo proprio (para poder matar tudo de uma vez) e, quando o gateway
// roda como root, faz o codigo do aluno rodar como "nobody".
func isolate(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	if os.Geteuid() == 0 {
		cmd.SysProcAttr.Credential = &syscall.Credential{Uid: nobody, Gid: nobody}
	}
}

// killGroup mata o processo e todos os filhos (o sh, o node, o compilador...).
func killGroup(cmd *exec.Cmd) {
	if cmd.Process != nil {
		syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
	}
}

// handOverTo entrega o diretorio da execucao ao usuario "nobody" (so se somos root).
func handOverTo(dir string) error {
	if os.Geteuid() != 0 {
		return nil
	}
	return filepath.Walk(dir, func(path string, _ os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		return os.Chown(path, nobody, nobody)
	})
}

// groupRSS soma a memoria residente de todos os processos do grupo `pgid` (le /proc; 0 se nao der).
func groupRSS(pgid int) int64 {
	entries, err := filepath.Glob("/proc/[0-9]*/stat")
	if err != nil {
		return 0
	}
	var total int64
	for _, path := range entries {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		// "pid (comm) state ppid pgrp ... rss ...": o nome pode ter espacos, entao corta no ultimo ')'.
		text := string(data)
		i := strings.LastIndexByte(text, ')')
		if i < 0 {
			continue
		}
		f := strings.Fields(text[i+1:])
		if len(f) < 22 {
			continue
		}
		if group, _ := strconv.Atoi(f[2]); group != pgid {
			continue
		}
		pages, _ := strconv.ParseInt(f[21], 10, 64)
		total += pages * int64(os.Getpagesize())
	}
	return total
}

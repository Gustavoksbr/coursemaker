//go:build !windows

package main

import (
	"os"
	"os/exec"
	"path/filepath"
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

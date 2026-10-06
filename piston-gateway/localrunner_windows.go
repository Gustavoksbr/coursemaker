//go:build windows

package main

import "os/exec"

// No Windows o executor local so serve para compilar o projeto; sem isolamento de verdade.
func isolate(cmd *exec.Cmd) {}

func killGroup(cmd *exec.Cmd) {
	if cmd.Process != nil {
		cmd.Process.Kill()
	}
}

func handOverTo(dir string) error { return nil }

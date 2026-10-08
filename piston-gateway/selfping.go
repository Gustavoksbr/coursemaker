package main

import (
	"log"
	"net/http"
	"strings"
	"time"
)

// selfPingInterval fica bem abaixo dos 15 minutos de inatividade apos os quais o plano gratuito do
// Render poe o servico para dormir.
const selfPingInterval = 10 * time.Minute

// selfPingTarget monta a URL que sera chamada a partir do valor de AUTO_PING_URL: o endereco publico do
// proprio servico (ex.: https://coursemaker-piston.onrender.com), com ou sem barra final. Vazio = desligado.
func selfPingTarget(baseURL string) string {
	base := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if base == "" {
		return ""
	}
	return base + "/health"
}

// startSelfPing chama /health do proprio gateway, pela URL publica, a cada `interval`, para o Render
// nunca considera-lo ocioso. Tem de ser a URL publica e nao localhost: so o trafego que entra pelo
// proxy do Render conta como atividade. Devolve uma funcao que interrompe o laco (usada nos testes);
// sem URL configurada nao faz nada, como em desenvolvimento local.
func startSelfPing(baseURL string, interval time.Duration, client *http.Client) (stop func()) {
	target := selfPingTarget(baseURL)
	if target == "" {
		return func() {}
	}

	done := make(chan struct{})
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				if err := pingOnce(client, target); err != nil {
					log.Printf("self-ping falhou: %v", err)
				}
			}
		}
	}()
	return func() { close(done) }
}

func pingOnce(client *http.Client, target string) error {
	response, err := client.Get(target)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode >= 400 {
		return &pingStatusError{status: response.StatusCode}
	}
	return nil
}

type pingStatusError struct{ status int }

func (e *pingStatusError) Error() string { return "resposta " + http.StatusText(e.status) }

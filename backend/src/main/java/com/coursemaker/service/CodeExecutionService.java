package com.coursemaker.service;

import com.coursemaker.dto.code.CodeExecutionDtos.ExecuteRequest;
import com.coursemaker.dto.code.CodeExecutionDtos.ExecuteResponse;
import com.coursemaker.dto.code.CodeExecutionDtos.ExerciseRequest;
import com.coursemaker.dto.code.CodeExecutionDtos.ExerciseResponse;
import com.coursemaker.dto.code.CodeExecutionDtos.RunOutputRequest;
import com.coursemaker.dto.code.CodeExecutionDtos.RunOutputResponse;
import com.coursemaker.dto.code.CodeExecutionDtos.RunTestsRequest;
import com.coursemaker.dto.code.CodeExecutionDtos.RunTestsResponse;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ServiceUnavailableException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Set;

/**
 * Fala com o piston-gateway (Go), que e quem de fato conversa com o Piston - o Piston nao tem
 * autenticacao propria e nunca fica acessivel fora da rede interna do Docker. Aqui so repassamos
 * a requisicao com o bearer token compartilhado.
 */
@Slf4j
@Service
public class CodeExecutionService {

    private static final Set<String> LANGUAGES = Set.of("javascript", "python", "java");

    @Value("${code-runner.url}")
    private String runnerUrl;

    @Value("${code-runner.token}")
    private String runnerToken;

    private RestClient restClient;

    @PostConstruct
    void init() {
        // Java e C++ compilam a cada execucao: 20 testes levam alguns segundos, entao a leitura
        // precisa de folga. Sem timeout nenhum, um gateway travado seguraria a requisicao para sempre.
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(60_000);
        this.restClient = RestClient.builder().baseUrl(runnerUrl).requestFactory(factory).build();
    }

    /** Roda a funcao do usuario contra varios testes (modo "funcao"). */
    public RunTestsResponse runTests(RunTestsRequest request) {
        return call("/run-tests", request, RunTestsResponse.class);
    }

    /** Roda o programa do usuario uma vez por teste, comparando o stdout (modo "saida"). */
    public RunOutputResponse runOutput(RunOutputRequest request) {
        return call("/run-output", request, RunOutputResponse.class);
    }

    public ExecuteResponse execute(ExecuteRequest request) {
        requireSupportedLanguage(request.language());
        return call("/execute", request, ExecuteResponse.class);
    }

    public ExerciseResponse runSquareExercise(ExerciseRequest request) {
        requireSupportedLanguage(request.language());
        return call("/exercises/square/run", request, ExerciseResponse.class);
    }

    private void requireSupportedLanguage(String language) {
        if (!LANGUAGES.contains(language)) {
            throw new BadRequestException("Linguagem nao suportada neste prototipo: " + language
                    + " (use " + String.join(", ", LANGUAGES) + ")");
        }
    }

    private <T> T call(String path, Object body, Class<T> responseType) {
        if (runnerToken == null || runnerToken.isBlank()) {
            throw new ServiceUnavailableException("O executor de codigo nao esta configurado neste momento.");
        }
        try {
            T response = restClient.post()
                    .uri(path)
                    .header("Authorization", "Bearer " + runnerToken)
                    .body(body)
                    .retrieve()
                    .body(responseType);
            if (response == null) {
                throw new ServiceUnavailableException("O executor de codigo nao respondeu. Tente novamente.");
            }
            return response;
        } catch (RestClientException ex) {
            log.error("Falha ao chamar o piston-gateway", ex);
            throw new ServiceUnavailableException("O executor de codigo esta indisponivel no momento.");
        }
    }
}

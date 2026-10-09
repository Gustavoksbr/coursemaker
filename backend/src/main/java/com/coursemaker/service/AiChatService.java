package com.coursemaker.service;

import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.Lesson;
import com.coursemaker.domain.entity.LessonBlock;
import com.coursemaker.domain.entity.Module;
import com.coursemaker.domain.entity.Post;
import com.coursemaker.domain.entity.PostBlock;
import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.BlockType;
import com.coursemaker.dto.ai.AiChatDtos.ChatMessage;
import com.coursemaker.dto.ai.AiChatDtos.ChatRequest;
import com.coursemaker.dto.ai.AiChatDtos.ChatResponse;
import com.coursemaker.exception.ApiExceptions.RateLimitExceededException;
import com.coursemaker.exception.ApiExceptions.ServiceUnavailableException;
import com.coursemaker.repository.LessonBlockRepository;
import com.coursemaker.repository.LessonRepository;
import com.coursemaker.repository.ModuleRepository;
import com.coursemaker.repository.PostBlockRepository;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Backs the "Assistente" chat on course and post pages. On a course it reads the lesson the viewer has
 * open (plus the lesson titles, see {@link AiChatContext}); on a post, the post itself. The text goes to
 * Groq as a system prompt and the answer is grounded in it. Images and videos cannot be described this
 * way, so they are skipped.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatService {

    private static final int MAX_POST_CHARS = 14_000;
    private static final int MAX_MESSAGES_PER_WINDOW = 20;
    private static final Duration RATE_LIMIT_WINDOW = Duration.ofMinutes(10);

    private final CourseService courseService;
    private final CourseAccessService courseAccessService;
    private final PostService postService;
    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final LessonBlockRepository lessonBlockRepository;
    private final PostBlockRepository postBlockRepository;

    @Value("${groq.api-key}")
    private String apiKey;

    @Value("${groq.model}")
    private String model;

    @Value("${groq.api-url}")
    private String apiUrl;

    private RestClient restClient;

    /** Per-user request timestamps, used for a lightweight sliding-window rate limit. */
    private final Map<UUID, Deque<Instant>> requestLog = new ConcurrentHashMap<>();

    @PostConstruct
    void init() {
        this.restClient = RestClient.builder().baseUrl(apiUrl).build();
    }

    // Deliberately not @Transactional: the Groq HTTP call below can take seconds, and a request-
    // scoped DB transaction has no reason to stay open across a call to an external API. Each
    // repository lookup below manages its own short transaction.
    public ChatResponse chatAboutCourse(UUID courseId, ChatRequest request, User viewer) {
        Course course = courseService.loadVisible(courseId, viewer);
        courseAccessService.requireContentAccess(course, viewer);

        List<Module> modules = moduleRepository.findByCourseOrdered(course.getId());
        List<Lesson> lessons = lessonRepository.findAllByCourseId(course.getId());
        // Looked up among the course's own lessons, so an id from another course (or a stale one) just
        // means "no lesson open" instead of leaking someone else's content.
        Lesson open = request.lessonId() == null ? null : lessons.stream()
                .filter(lesson -> lesson.getId().equals(request.lessonId()))
                .findFirst()
                .orElse(null);
        List<LessonBlock> blocks = open == null ? List.of() : lessonBlockRepository.findByLessonOrdered(open.getId());

        String context = AiChatContext.courseContext(
                course.getName(), course.getDescription(), modules, lessons, open, blocks,
                AiChatContext.searchQuery(request.message(), request.history()));
        return chat(viewer, AiChatContext.systemPrompt(course.getName(), context), request);
    }

    public ChatResponse chatAboutPost(UUID postId, ChatRequest request, User viewer) {
        Post post = postService.loadVisible(postId, viewer);

        String context = buildPostContext(post, AiChatContext.searchQuery(request.message(), request.history()));
        return chat(viewer, postSystemPrompt(post.getTitle(), context), request);
    }

    // ------------------------------------------------------------------- chat

    private ChatResponse chat(User viewer, String systemPrompt, ChatRequest request) {
        assertNotRateLimited(viewer.getId());

        if (apiKey == null || apiKey.isBlank()) {
            throw new ServiceUnavailableException("O assistente de IA não está configurado neste momento.");
        }

        List<GroqMessage> messages = new ArrayList<>();
        messages.add(new GroqMessage("system", systemPrompt));
        for (ChatMessage turn : AiChatContext.trimHistory(request.history())) {
            messages.add(new GroqMessage(turn.role(), turn.content()));
        }
        messages.add(new GroqMessage("user", request.message()));

        GroqRequest body = new GroqRequest(model, messages, 0.4, 1024);

        try {
            GroqResponse response = restClient.post()
                    .header("Authorization", "Bearer " + apiKey)
                    .body(body)
                    .retrieve()
                    .body(GroqResponse.class);

            String reply = response == null || response.choices() == null || response.choices().isEmpty()
                    ? null
                    : response.choices().get(0).message().content();

            if (reply == null || reply.isBlank()) {
                throw new ServiceUnavailableException("O assistente nao conseguiu responder. Tente novamente.");
            }
            return new ChatResponse(reply.trim());
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            if (status == 429) {
                // The plan's per-minute token budget is shared by every student: ask them to wait a moment.
                long retryAfter = retryAfterSeconds(ex);
                log.warn("Groq devolveu 429 (limite de tokens por minuto); tentar de novo em {}s", retryAfter);
                throw new RateLimitExceededException(
                        "O assistente esta com muitas perguntas agora. Tente de novo em alguns segundos.", retryAfter);
            }
            log.error("Groq API respondeu {}: {}", status, ex.getResponseBodyAsString());
            if (status == 413) {
                throw new ServiceUnavailableException(
                        "Esta pergunta e a conversa ficaram grandes demais para o assistente. Tente uma pergunta mais curta.");
            }
            throw new ServiceUnavailableException("O assistente de IA esta indisponivel no momento. Tente novamente em instantes.");
        } catch (RestClientException ex) {
            log.error("Falha ao chamar a Groq API", ex);
            throw new ServiceUnavailableException("O assistente de IA esta indisponivel no momento. Tente novamente em instantes.");
        }
    }

    private static long retryAfterSeconds(RestClientResponseException ex) {
        String header = ex.getResponseHeaders() == null ? null : ex.getResponseHeaders().getFirst("retry-after");
        try {
            return Math.max(1, Long.parseLong(header.trim()));
        } catch (RuntimeException missingOrNotANumber) {
            return 20;
        }
    }

    private void assertNotRateLimited(UUID userId) {
        Instant now = Instant.now();
        Deque<Instant> timestamps = requestLog.computeIfAbsent(userId, id -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty()
                    && Duration.between(timestamps.peekFirst(), now).compareTo(RATE_LIMIT_WINDOW) > 0) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= MAX_MESSAGES_PER_WINDOW) {
                long retryAfter = RATE_LIMIT_WINDOW.minus(Duration.between(timestamps.peekFirst(), now)).toSeconds();
                throw new RateLimitExceededException(
                        "Voce enviou muitas perguntas em pouco tempo. Aguarde um instante.", Math.max(1, retryAfter));
            }
            timestamps.addLast(now);
        }
    }

    // --------------------------------------------------------------- context

    private String postSystemPrompt(String title, String context) {
        return """
                Voce e o assistente de IA do CourseMaker, integrado a pagina de um post chamado "%s".
                Responda apenas com base no conteudo fornecido abaixo. Se a resposta nao estiver no
                conteudo, diga que essa informacao nao esta disponivel neste post em vez de inventar.
                Responda sempre em portugues do Brasil, de forma clara e objetiva.

                Formate a resposta em Markdown simples quando ajudar a leitura: paragrafos curtos,
                **negrito** para destacar termos, listas com "-" e blocos de codigo com ``` quando
                mostrar codigo. Nao use tabelas nem HTML.

                ===== CONTEUDO =====
                %s
                ===== FIM DO CONTEUDO =====
                """.formatted(title, context.isBlank() ? "(sem conteudo de texto disponivel)" : context);
    }

    private String buildPostContext(Post post, String query) {
        StringBuilder sb = new StringBuilder();
        sb.append("Post: ").append(post.getTitle()).append('\n');
        if (post.getDescription() != null && !post.getDescription().isBlank()) {
            sb.append("Descricao: ").append(post.getDescription()).append('\n');
        }
        sb.append('\n');

        List<PostBlock> blocks = postBlockRepository.findByPostOrdered(post.getId());
        long withTranscript = blocks.stream()
                .filter(block -> block.getType() == BlockType.VIDEO && block.getTranscript() != null && !block.getTranscript().isBlank())
                .count();
        int perVideo = withTranscript == 0 ? 0 : AiChatContext.MAX_TRANSCRIPT_CHARS / (int) withTranscript;
        for (PostBlock block : blocks) {
            AiChatContext.appendBlock(sb, block.getType(), block.getContent(), block.getLanguage(),
                    block.getTranscript(), query, perVideo);
            if (sb.length() > MAX_POST_CHARS) {
                break;
            }
        }
        return truncate(sb);
    }

    private String truncate(StringBuilder sb) {
        if (sb.length() <= MAX_POST_CHARS) {
            return sb.toString();
        }
        return sb.substring(0, MAX_POST_CHARS) + "\n[...conteudo truncado...]";
    }

    // -------------------------------------------------------- Groq API shapes

    private record GroqMessage(String role, String content) {
    }

    private record GroqRequest(
            String model,
            List<GroqMessage> messages,
            double temperature,
            @JsonProperty("max_tokens") int maxTokens) {
    }

    private record GroqResponse(List<GroqChoice> choices) {
    }

    private record GroqChoice(GroqMessage message) {
    }
}

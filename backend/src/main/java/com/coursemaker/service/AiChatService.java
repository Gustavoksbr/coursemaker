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
import org.jsoup.Jsoup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Backs the "Assistente" chat on course and post pages. It gathers every text/code block the
 * viewer is allowed to see, hands it to Groq as a system prompt, and answers the viewer's question
 * grounded in that content. Images and videos cannot be described this way, so they are skipped.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatService {

    private static final int MAX_CONTEXT_CHARS = 14_000;
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

        String context = buildCourseContext(course);
        String systemPrompt = systemPrompt("curso", course.getName(), context);
        return chat(viewer, systemPrompt, request);
    }

    public ChatResponse chatAboutPost(UUID postId, ChatRequest request, User viewer) {
        Post post = postService.loadVisible(postId, viewer);

        String context = buildPostContext(post);
        String systemPrompt = systemPrompt("post", post.getTitle(), context);
        return chat(viewer, systemPrompt, request);
    }

    // ------------------------------------------------------------------- chat

    private ChatResponse chat(User viewer, String systemPrompt, ChatRequest request) {
        assertNotRateLimited(viewer.getId());

        if (apiKey == null || apiKey.isBlank()) {
            throw new ServiceUnavailableException("O assistente de IA nao esta configurado neste momento.");
        }

        List<GroqMessage> messages = new ArrayList<>();
        messages.add(new GroqMessage("system", systemPrompt));
        for (ChatMessage turn : safeHistory(request.history())) {
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
        } catch (RestClientException ex) {
            log.error("Falha ao chamar a Groq API", ex);
            throw new ServiceUnavailableException("O assistente de IA esta indisponivel no momento. Tente novamente em instantes.");
        }
    }

    private List<ChatMessage> safeHistory(List<ChatMessage> history) {
        if (history == null || history.isEmpty()) {
            return List.of();
        }
        // Keep only the most recent turns; older context matters less than staying within budget.
        int from = Math.max(0, history.size() - 8);
        return history.subList(from, history.size());
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

    private String systemPrompt(String kind, String title, String context) {
        return """
                Voce e o assistente de IA do CourseMaker, integrado a pagina de um %s chamado "%s".
                Responda apenas com base no conteudo fornecido abaixo. Se a resposta nao estiver no
                conteudo, diga que essa informacao nao esta disponivel neste %s em vez de inventar.
                Responda sempre em portugues do Brasil, de forma clara e objetiva.

                Formate a resposta em Markdown simples quando ajudar a leitura: paragrafos curtos,
                **negrito** para destacar termos, listas com "-" e blocos de codigo com ``` quando
                mostrar codigo. Nao use tabelas nem HTML.

                ===== CONTEUDO =====
                %s
                ===== FIM DO CONTEUDO =====
                """.formatted(kind, title, kind, context.isBlank() ? "(sem conteudo de texto disponivel)" : context);
    }

    private String buildCourseContext(Course course) {
        StringBuilder sb = new StringBuilder();
        sb.append("Curso: ").append(course.getName()).append('\n');
        if (course.getDescription() != null && !course.getDescription().isBlank()) {
            sb.append("Descricao: ").append(course.getDescription()).append('\n');
        }

        List<Module> modules = moduleRepository.findByCourseOrdered(course.getId());
        Map<UUID, List<Lesson>> lessonsByModule = lessonRepository.findAllByCourseId(course.getId()).stream()
                .collect(Collectors.groupingBy(lesson -> lesson.getModule().getId()));

        for (Module module : modules) {
            sb.append("\n## Modulo: ").append(module.getTitle()).append('\n');
            for (Lesson lesson : lessonsByModule.getOrDefault(module.getId(), List.of())) {
                sb.append("\n### Aula: ").append(lesson.getTitle()).append('\n');
                for (LessonBlock block : lessonBlockRepository.findByLessonOrdered(lesson.getId())) {
                    appendBlock(sb, block.getType(), block.getContent(), block.getLanguage());
                    if (sb.length() > MAX_CONTEXT_CHARS) {
                        return truncate(sb);
                    }
                }
            }
        }
        return truncate(sb);
    }

    private String buildPostContext(Post post) {
        StringBuilder sb = new StringBuilder();
        sb.append("Post: ").append(post.getTitle()).append('\n');
        if (post.getDescription() != null && !post.getDescription().isBlank()) {
            sb.append("Descricao: ").append(post.getDescription()).append('\n');
        }
        sb.append('\n');

        for (PostBlock block : postBlockRepository.findByPostOrdered(post.getId())) {
            appendBlock(sb, block.getType(), block.getContent(), block.getLanguage());
            if (sb.length() > MAX_CONTEXT_CHARS) {
                break;
            }
        }
        return truncate(sb);
    }

    private void appendBlock(StringBuilder sb, BlockType type, String content, String language) {
        if (content == null || content.isBlank()) {
            return;
        }
        switch (type) {
            case TEXT -> sb.append(Jsoup.parse(content).text()).append('\n');
            case CODE -> sb.append("```").append(language == null ? "" : language).append('\n')
                    .append(content).append("\n```\n");
            case IMAGE, VIDEO -> {
                // No visual/transcript understanding yet: just note that media exists here.
            }
        }
    }

    private String truncate(StringBuilder sb) {
        if (sb.length() <= MAX_CONTEXT_CHARS) {
            return sb.toString();
        }
        return sb.substring(0, MAX_CONTEXT_CHARS) + "\n[...conteudo truncado...]";
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

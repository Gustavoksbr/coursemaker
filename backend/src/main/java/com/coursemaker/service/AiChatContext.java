package com.coursemaker.service;

import com.coursemaker.domain.entity.Lesson;
import com.coursemaker.domain.entity.LessonBlock;
import com.coursemaker.domain.entity.Module;
import com.coursemaker.domain.enums.BlockType;
import com.coursemaker.dto.ai.AiChatDtos.ChatMessage;
import org.jsoup.Jsoup;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * What the assistant is told about a course. The Groq free plan allows 8,000 tokens per minute for the
 * whole app, so a request has to stay small: instead of cutting the whole course at a fixed size (which
 * left everything after the first lessons invisible), the assistant sees ONE lesson in full - the one
 * the student has open - plus the titles of every lesson. Pure functions, no I/O.
 */
final class AiChatContext {

    // Together with the history and the answer these have to fit the 8,000 tokens per minute of Groq's free
    // plan (about 3.3 characters per token), so the whole request stays near 7,500 tokens even when every part
    // is full.
    /** The open lesson's text and code, in characters. */
    static final int MAX_LESSON_CHARS = 6_000;
    /** The video transcripts of the open lesson, shared by its videos; only the stretches that fit the question. */
    static final int MAX_TRANSCRIPT_CHARS = 4_500;
    /** Module and lesson titles, so the assistant knows what exists without reading it. */
    static final int MAX_OUTLINE_CHARS = 2_500;
    /** Earlier turns sent back with a question. Replies run up to 4,000 characters each. */
    static final int MAX_HISTORY_CHARS = 4_000;
    static final int MAX_HISTORY_TURNS = 8;

    /** The sentence the student sees when they ask for a lesson the assistant cannot read. */
    static final String OTHER_LESSON_REPLY =
            "Infelizmente nao posso ver essa aula. Sugiro que voce acesse a aula e refaca a pergunta por la.";

    private AiChatContext() {
    }

    static String systemPrompt(String courseName, String context) {
        return """
                Voce e o assistente de IA do CourseMaker, integrado a pagina de um curso chamado "%s".

                IMPORTANTE - o que voce enxerga: apenas UMA aula por vez, a que o aluno esta com aberta
                (marcada como "AULA ABERTA AGORA" abaixo). Das demais aulas voce so conhece o titulo.

                Regras:
                1. Responda apenas com base no conteudo da aula aberta. Se a resposta nao estiver nele,
                   diga que essa informacao nao esta disponivel nesta aula, em vez de inventar.
                2. Se o aluno pedir algo sobre OUTRA aula (por exemplo "quero a aula X", "explique a aula 5",
                   "o que diz o video da aula Y?"), NAO tente responder e NAO use o titulo para adivinhar o
                   conteudo. Diga exatamente: "%s"
                3. Perguntas sobre o curso como um todo, como quais aulas existem ou por onde comecar, podem
                   ser respondidas com a lista de titulos e a descricao do curso.
                4. Se nenhuma aula estiver aberta, voce so tem a lista de titulos: para perguntas sobre o
                   conteudo, peca ao aluno que abra a aula e pergunte de novo.
                5. Voce nao ve nem ouve os videos. Quando um video vier acompanhado de um texto do autor
                   (transcricao, resumo ou explicacao), use-o para responder sobre o que o video diz e cite
                   o tempo, como 3:05, quando ele aparecer. Esse texto pode nao ser a fala exata nem cobrir o
                   video inteiro, e "[...]" marca trechos que nao foram incluidos; se a pergunta pedir mais do
                   que ele traz, diga isso. Sem texto do autor, explique que nao consegue ver o video e
                   responda apenas com o que estiver escrito na aula.

                Responda sempre em portugues do Brasil, de forma clara e objetiva.

                Formate a resposta em Markdown simples quando ajudar a leitura: paragrafos curtos,
                **negrito** para destacar termos, listas com "-" e blocos de codigo com ``` quando
                mostrar codigo. Nao use tabelas nem HTML.

                ===== CONTEUDO =====
                %s
                ===== FIM DO CONTEUDO =====
                """.formatted(courseName, OTHER_LESSON_REPLY, context);
    }

    /**
     * @param lessons     every lesson of the course, in course order
     * @param current     the open lesson, or null when the student is on the course's start page (or sent an
     *                    id that is not part of this course)
     * @param currentBlocks the blocks of {@code current}, in order
     * @param query       what the student asked (and just before it): picks which stretches of a long video
     *                    transcript are worth the space
     */
    static String courseContext(String courseName, String description, List<Module> modules,
                                List<Lesson> lessons, Lesson current, List<LessonBlock> currentBlocks, String query) {
        StringBuilder sb = new StringBuilder();
        sb.append("Curso: ").append(courseName).append('\n');
        if (description != null && !description.isBlank()) {
            sb.append("Descricao: ").append(description).append('\n');
        }

        sb.append('\n').append(outline(modules, lessons, current == null ? null : current.getId()));

        sb.append("\n----------\n");
        if (current == null) {
            sb.append("Nenhuma aula esta aberta (o aluno esta na pagina inicial do curso). Voce so tem a lista de titulos acima.\n");
        } else {
            sb.append("AULA ABERTA AGORA: ").append(current.getTitle()).append("\n\n");
            sb.append(lessonText(currentBlocks, query));
        }
        return sb.toString();
    }

    /** Module headings and lesson titles in course order, the open lesson flagged, cut at {@link #MAX_OUTLINE_CHARS}. */
    private static String outline(List<Module> modules, List<Lesson> lessons, UUID currentId) {
        Map<UUID, List<Lesson>> byModule = lessons.stream()
                .collect(Collectors.groupingBy(lesson -> lesson.getModule().getId()));
        int totalLessons = lessons.size();

        StringBuilder sb = new StringBuilder("AULAS DO CURSO (so os titulos; o conteudo so existe para a aula aberta):\n");
        int listed = 0;
        for (Module module : modules) {
            List<Lesson> inModule = byModule.getOrDefault(module.getId(), List.of());
            if (inModule.isEmpty()) {
                continue;
            }
            sb.append("## Modulo: ").append(module.getTitle()).append('\n');
            for (Lesson lesson : inModule) {
                if (sb.length() > MAX_OUTLINE_CHARS) {
                    return sb.append("- (...mais ").append(totalLessons - listed).append(" aulas)\n").toString();
                }
                sb.append("- ").append(lesson.getTitle());
                if (lesson.getId().equals(currentId)) {
                    sb.append("  <== AULA ABERTA AGORA");
                }
                sb.append('\n');
                listed++;
            }
        }
        return sb.toString();
    }

    /**
     * The text and code of one lesson (cut at {@link #MAX_LESSON_CHARS}) and, in place of each video, its
     * transcript when the author pasted one (at most {@link #MAX_TRANSCRIPT_CHARS} in all, the stretches that
     * match {@code query}) or a note that the assistant cannot watch it.
     */
    static String lessonText(List<LessonBlock> blocks, String query) {
        long withTranscript = blocks.stream()
                .filter(block -> block.getType() == BlockType.VIDEO && hasText(block.getTranscript()))
                .count();
        int perVideo = withTranscript == 0 ? 0 : MAX_TRANSCRIPT_CHARS / (int) withTranscript;

        StringBuilder sb = new StringBuilder();
        int textChars = 0;
        boolean cut = false;
        for (LessonBlock block : blocks) {
            boolean video = block.getType() == BlockType.VIDEO;
            if (cut && !video) {
                continue;
            }
            int before = sb.length();
            appendBlock(sb, block.getType(), block.getContent(), block.getLanguage(), block.getTranscript(), query, perVideo);
            if (!video) {
                textChars += sb.length() - before;
                if (textChars > MAX_LESSON_CHARS) {
                    sb.setLength(sb.length() - (textChars - MAX_LESSON_CHARS));
                    cut = true;
                }
            }
        }
        if (cut) {
            sb.append("\n[...restante da aula omitido por ser longo...]");
        }
        return sb.toString();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    static void appendBlock(StringBuilder sb, BlockType type, String content, String language,
                            String transcript, String query, int transcriptBudget) {
        switch (type) {
            case TEXT -> {
                if (content != null && !content.isBlank()) {
                    sb.append(Jsoup.parse(content).text()).append('\n');
                }
            }
            case CODE -> {
                if (content != null && !content.isBlank()) {
                    sb.append("```").append(language == null ? "" : language).append('\n')
                            .append(content).append("\n```\n");
                }
            }
            case VIDEO -> {
                String excerpt = BlockTranscripts.excerpt(transcript, query, transcriptBudget);
                if (excerpt.isEmpty()) {
                    // Say so, so the assistant does not pretend to know what the video covers.
                    sb.append("[Aqui ha um video; voce nao consegue ver nem ouvir o video, so o texto.]\n");
                } else {
                    sb.append("[Aqui ha um video. Texto do autor sobre ele (transcricao, resumo ou explicacao):]\n")
                            .append(excerpt).append("\n[Fim do texto sobre o video]\n");
                }
            }
            // Images carry nothing readable; questions hold their answers and exercises their tests, so
            // none of those go into the prompt.
            case IMAGE, QUESTION, CODE_EXERCISE -> {
            }
        }
    }

    /** What the student is asking about: the question plus the one before it, so "e depois disso?" still finds its place. */
    static String searchQuery(String message, List<ChatMessage> history) {
        String previous = "";
        if (history != null) {
            for (int i = history.size() - 1; i >= 0; i--) {
                if ("user".equals(history.get(i).role())) {
                    previous = history.get(i).content();
                    break;
                }
            }
        }
        return message + " " + previous;
    }

    /**
     * The most recent turns that fit in {@link #MAX_HISTORY_CHARS} (at most {@link #MAX_HISTORY_TURNS}), in
     * their original order. Each turn can be 4,000 characters, so eight of them used to be able to push a
     * request past the per-minute token limit on their own.
     */
    static List<ChatMessage> trimHistory(List<ChatMessage> history) {
        if (history == null || history.isEmpty()) {
            return List.of();
        }
        List<ChatMessage> kept = new ArrayList<>();
        int used = 0;
        for (int i = history.size() - 1; i >= 0 && kept.size() < MAX_HISTORY_TURNS; i--) {
            ChatMessage turn = history.get(i);
            used += turn.content().length();
            if (used > MAX_HISTORY_CHARS) {
                break;
            }
            kept.add(turn);
        }
        Collections.reverse(kept);
        return kept;
    }
}

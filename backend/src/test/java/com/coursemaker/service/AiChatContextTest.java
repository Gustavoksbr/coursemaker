package com.coursemaker.service;

import com.coursemaker.domain.entity.Lesson;
import com.coursemaker.domain.entity.LessonBlock;
import com.coursemaker.domain.entity.Module;
import com.coursemaker.domain.enums.BlockType;
import com.coursemaker.dto.ai.AiChatDtos.ChatMessage;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Plain unit test: what the assistant is told about a course, with no Spring context. */
class AiChatContextTest {

    private final Module intro = module("Introducao");
    private final Module loops = module("Repeticao");
    private final Lesson what = lesson(intro, "O que e um algoritmo");
    private final Lesson whileLesson = lesson(loops, "Laco while");
    private final Lesson forLesson = lesson(loops, "Laco for");
    private final List<Module> modules = List.of(intro, loops);
    private final List<Lesson> lessons = List.of(what, whileLesson, forLesson);

    @Test
    void readsOnlyTheOpenLessonButListsEveryTitle() {
        List<LessonBlock> blocks = List.of(
                block(BlockType.TEXT, "<p>O <strong>while</strong> repete enquanto a condicao for verdadeira.</p>", null),
                block(BlockType.CODE, "while x < 3: x += 1", "python"));

        String context = AiChatContext.courseContext("Logica", "Curso de logica", modules, lessons, whileLesson, blocks, "");

        assertThat(context)
                .contains("Curso: Logica", "Descricao: Curso de logica")
                .contains("## Modulo: Introducao", "## Modulo: Repeticao")
                .contains("- O que e um algoritmo", "- Laco while  <== AULA ABERTA AGORA", "- Laco for")
                .contains("AULA ABERTA AGORA: Laco while")
                .contains("O while repete enquanto a condicao for verdadeira.")
                .contains("```python\nwhile x < 3: x += 1\n```");
        // Only the open lesson was handed to the builder, so nothing of the others can appear.
        assertThat(context).doesNotContain("segredo da outra aula");
    }

    @Test
    void withoutAnOpenLessonOnlyTheTitlesAreKnown() {
        String context = AiChatContext.courseContext("Logica", null, modules, lessons, null, List.of(), "");

        assertThat(context)
                .contains("- O que e um algoritmo", "- Laco while", "- Laco for")
                .contains("Nenhuma aula esta aberta")
                .doesNotContain("AULA ABERTA AGORA:")
                .doesNotContain("Descricao:");
    }

    @Test
    void tellsTheAssistantItCannotWatchVideosAndSkipsAnswerBearingBlocks() {
        List<LessonBlock> blocks = List.of(
                block(BlockType.VIDEO, "https://www.youtube.com/watch?v=abc", null),
                block(BlockType.IMAGE, "https://example.com/a.png", null),
                block(BlockType.QUESTION, "{\"alternatives\":[{\"text\":\"Resposta certa\",\"correct\":true}]}", null),
                block(BlockType.CODE_EXERCISE, "{\"title\":\"Exercicio\",\"expected\":42}", null));

        String text = AiChatContext.lessonText(blocks, "");

        assertThat(text).contains("nao consegue ver nem ouvir o video");
        assertThat(text).doesNotContain("youtube", "example.com", "Resposta certa", "expected");
    }

    @Test
    void cutsAVeryLongLessonAndSaysSo() {
        List<LessonBlock> blocks = new ArrayList<>();
        for (int i = 0; i < 40; i++) {
            blocks.add(block(BlockType.TEXT, "<p>" + "palavra ".repeat(60) + "</p>", null));
        }

        String text = AiChatContext.lessonText(blocks, "");

        assertThat(text.length()).isLessThan(AiChatContext.MAX_LESSON_CHARS + 100);
        assertThat(text).endsWith("[...restante da aula omitido por ser longo...]");
    }

    @Test
    void shortensTheOutlineOfAHugeCourseInsteadOfOverflowing() {
        List<Module> bigModules = new ArrayList<>();
        List<Lesson> bigLessons = new ArrayList<>();
        for (int m = 0; m < 20; m++) {
            Module module = module("Modulo " + m);
            bigModules.add(module);
            for (int l = 0; l < 20; l++) {
                bigLessons.add(lesson(module, "Aula numero " + m + "-" + l + " com um titulo bem comprido para ocupar espaco"));
            }
        }

        String context = AiChatContext.courseContext("Enorme", null, bigModules, bigLessons, null, List.of(), "");

        assertThat(context).contains("(...mais ").contains(" aulas)");
        assertThat(context.length()).isLessThan(AiChatContext.MAX_OUTLINE_CHARS + 600);
    }

    @Test
    void systemPromptExplainsTheOneLessonRuleAndTheRefusalSentence() {
        String prompt = AiChatContext.systemPrompt("Logica", "contexto qualquer");

        assertThat(prompt)
                .contains("curso chamado \"Logica\"")
                .contains("apenas UMA aula por vez")
                .contains("Infelizmente nao posso ver essa aula. Sugiro que voce acesse a aula e refaca a pergunta por la.")
                .contains("===== CONTEUDO =====\ncontexto qualquer\n===== FIM DO CONTEUDO =====");
    }

    @Test
    void keepsTheNewestTurnsThatFitTheHistoryBudget() {
        List<ChatMessage> history = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            history.add(new ChatMessage(i % 2 == 0 ? "user" : "assistant", "turno " + i + " " + "x".repeat(1_000)));
        }

        List<ChatMessage> kept = AiChatContext.trimHistory(history);

        int chars = kept.stream().mapToInt(turn -> turn.content().length()).sum();
        assertThat(chars).isLessThanOrEqualTo(AiChatContext.MAX_HISTORY_CHARS);
        assertThat(kept).hasSizeLessThanOrEqualTo(AiChatContext.MAX_HISTORY_TURNS);
        // it is the newest stretch of the conversation, in the original order
        assertThat(kept).isEqualTo(history.subList(history.size() - kept.size(), history.size()));
        assertThat(kept).isNotEmpty();
    }

    @Test
    void putsTheAuthorsTranscriptInPlaceOfTheVideoNote() {
        LessonBlock video = block(BlockType.VIDEO, "https://www.youtube.com/watch?v=abc", null);
        video.setTranscript("0:00\nHoje vamos falar de funcoes\n0:10\nUma funcao devolve um valor");

        String text = AiChatContext.lessonText(List.of(video), "o que e uma funcao?");

        assertThat(text)
                .contains("Texto do autor sobre ele (transcricao, resumo ou explicacao)")
                .contains("0:10 Uma funcao devolve um valor")
                .contains("[Fim do texto sobre o video]")
                .doesNotContain("nao consegue ver nem ouvir o video", "youtube");
    }

    @Test
    void aBlankTranscriptCountsAsNoTranscript() {
        LessonBlock video = block(BlockType.VIDEO, "https://www.youtube.com/watch?v=abc", null);
        video.setTranscript("   ");

        assertThat(AiChatContext.lessonText(List.of(video), "oi")).contains("nao consegue ver nem ouvir o video");
    }

    @Test
    void transcriptsHaveTheirOwnBudgetAndDoNotEatTheLessonText() {
        LessonBlock text = block(BlockType.TEXT, "<p>Texto importante da aula.</p>", null);
        LessonBlock video = block(BlockType.VIDEO, "https://www.youtube.com/watch?v=abc", null);
        video.setTranscript(("0:01\n" + "palavra de transcricao. ".repeat(80) + "\n").repeat(40)); // far over budget

        String lesson = AiChatContext.lessonText(List.of(text, video), "palavra");

        assertThat(lesson).contains("Texto importante da aula.");
        assertThat(lesson.length()).isLessThan(AiChatContext.MAX_TRANSCRIPT_CHARS + 400);
    }

    @Test
    void severalVideosShareTheTranscriptBudget() {
        LessonBlock a = block(BlockType.VIDEO, "https://www.youtube.com/watch?v=a", null);
        LessonBlock b = block(BlockType.VIDEO, "https://www.youtube.com/watch?v=b", null);
        a.setTranscript(("0:01 alfa " + "x".repeat(700) + "\n").repeat(20));
        b.setTranscript(("0:01 beta " + "y".repeat(700) + "\n").repeat(20));

        String lesson = AiChatContext.lessonText(List.of(a, b), "");

        assertThat(lesson).contains("alfa", "beta");
        assertThat(lesson.length()).isLessThan(AiChatContext.MAX_TRANSCRIPT_CHARS + 600);
    }

    @Test
    void theSearchQueryAddsTheLastQuestionToTheNewOne() {
        List<ChatMessage> history = List.of(
                new ChatMessage("user", "fale de vetores"),
                new ChatMessage("assistant", "Vetores sao..."));

        assertThat(AiChatContext.searchQuery("e as matrizes?", history)).contains("e as matrizes?", "fale de vetores");
        assertThat(AiChatContext.searchQuery("oi", null)).startsWith("oi");
    }

    @Test
    void emptyOrMissingHistoryIsFine() {
        assertThat(AiChatContext.trimHistory(null)).isEmpty();
        assertThat(AiChatContext.trimHistory(List.of())).isEmpty();
    }

    private static Module module(String title) {
        return Module.builder().id(UUID.randomUUID()).title(title).build();
    }

    private static Lesson lesson(Module module, String title) {
        return Lesson.builder().id(UUID.randomUUID()).module(module).title(title).build();
    }

    private static LessonBlock block(BlockType type, String content, String language) {
        return LessonBlock.builder().id(UUID.randomUUID()).type(type).content(content).language(language).build();
    }
}

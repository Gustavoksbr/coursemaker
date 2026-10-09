package com.coursemaker.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/** Plain unit test: cleaning a pasted transcript and choosing which stretches of it the assistant reads. */
class BlockTranscriptsTest {

    @Test
    void normalizeKeepsTextAndTurnsBlankIntoNothing() {
        assertThat(BlockTranscripts.normalize(null)).isNull();
        assertThat(BlockTranscripts.normalize("  \n\t ")).isNull();
        assertThat(BlockTranscripts.normalize("  ola\r\nmundo  ")).isEqualTo("ola\nmundo");
    }

    @Test
    void normalizeDropsControlCharactersThatPostgresRefuses() {
        assertThat(BlockTranscripts.normalize("a\u0000b\u0007c")).isEqualTo("abc");
    }

    @Test
    void compactJoinsEachYoutubeTimestampLineWithTheTextAfterIt() {
        String pasted = "0:00\nIntroducao ao curso\n0:05\nVamos comecar\n1:02:03\nFim";

        assertThat(BlockTranscripts.compact(pasted))
                .containsExactly("0:00 Introducao ao curso", "0:05 Vamos comecar", "1:02:03 Fim");
    }

    @Test
    void compactReadsSubtitleFiles() {
        String srt = "1\n00:00:01,000 --> 00:00:04,000\nOla pessoal\n\n2\n00:01:05,500 --> 00:01:08,000\nVamos ver funcoes\n";
        String vtt = "WEBVTT\n\n01:05.000 --> 01:08.000\nTexto do vtt";

        assertThat(BlockTranscripts.compact(srt)).containsExactly("0:01 Ola pessoal", "1:05 Vamos ver funcoes");
        assertThat(BlockTranscripts.compact(vtt)).containsExactly("1:05 Texto do vtt");
    }

    @Test
    void aTranscriptThatFitsIsReturnedWhole() {
        String transcript = "0:00\nPrimeira parte\n0:30\nSegunda parte";

        assertThat(BlockTranscripts.excerpt(transcript, "qualquer coisa", 1_000))
                .isEqualTo("0:00 Primeira parte\n0:30 Segunda parte");
    }

    @Test
    void aLongTranscriptYieldsTheStretchesThatMentionWhatWasAsked() {
        String transcript = longTranscript(60, "assunto comum sem graca", 40, "O vetor guarda varios valores");

        String excerpt = BlockTranscripts.excerpt(transcript, "como funciona o vetor?", 3_000);

        assertThat(excerpt.length()).isLessThanOrEqualTo(3_000);
        assertThat(excerpt).contains("O vetor guarda varios valores");
        assertThat(excerpt).contains("[...]");
    }

    @Test
    void matchesWithoutAccentsAndAcrossPluralAndVerbForms() {
        String transcript = longTranscript(60, "assunto comum sem graca", 25, "As funcoes devolvem um valor");

        assertThat(BlockTranscripts.excerpt(transcript, "o que e uma FUNÇÃO?", 3_000))
                .contains("As funcoes devolvem um valor");
    }

    @Test
    void aQuestionThatNamesNothingSpreadsTheExcerptOverTheWholeVideo() {
        String transcript = IntStream.range(0, 80)
                .mapToObj(i -> "%d:%02d marco%03d %s".formatted(i / 6, (i % 6) * 10, i, "texto ".repeat(40)))
                .collect(Collectors.joining("\n"));

        String excerpt = BlockTranscripts.excerpt(transcript, "resuma esta aula", 3_000);

        assertThat(excerpt.length()).isLessThanOrEqualTo(3_000);
        assertThat(excerpt).contains("marco000");   // the beginning
        assertThat(excerpt).contains("marco079");   // and the end
    }

    @Test
    void readsTheMomentAStudentAsksAbout() {
        assertThat(BlockTranscripts.queryTime("o q ele fala no minuto  6")).isEqualTo(360);
        assertThat(BlockTranscripts.queryTime("o que diz no minuto 6?")).isEqualTo(360);
        assertThat(BlockTranscripts.queryTime("resuma a parte aos 12 minutos")).isEqualTo(720);
        assertThat(BlockTranscripts.queryTime("o que acontece em 1:30?")).isEqualTo(90);
        assertThat(BlockTranscripts.queryTime("e em 1:02:03")).isEqualTo(3723);
        assertThat(BlockTranscripts.queryTime("o que e um vetor?")).isEqualTo(-1);
        assertThat(BlockTranscripts.queryTime(null)).isEqualTo(-1);
    }

    @Test
    void aQuestionAboutAMinuteGetsThatStretchOfAParagraphStyleTranscript() {
        // A summary written as paragraphs, each opening with its time in parentheses, like the one Gemini gives.
        String transcript = IntStream.range(0, 14)
                .mapToObj(i -> "(%d:00) Paragrafo %02d. %s".formatted(i, i, "texto sobre o assunto ".repeat(30)))
                .collect(Collectors.joining("\n"));
        assertThat(transcript.length()).isGreaterThan(7_000);

        String excerpt = BlockTranscripts.excerpt(transcript, "o q ele fala no minuto  6 fala", 4_500);

        assertThat(excerpt.length()).isLessThanOrEqualTo(4_500);
        assertThat(excerpt).contains("(6:00) Paragrafo 06");
        // and the paragraph that follows it, because the answer often runs into it
        assertThat(excerpt).contains("(7:00) Paragrafo 07");
    }

    @Test
    void theMinuteAlsoWorksWhenTheTimesAreOnTheirOwnLines() {
        String transcript = IntStream.range(0, 40)
                .mapToObj(i -> "%d:%02d\nfala numero %02d %s".formatted(i / 6, (i % 6) * 10, i, "palavras ".repeat(25)))
                .collect(Collectors.joining("\n"));

        String excerpt = BlockTranscripts.excerpt(transcript, "o que diz aos 3 minutos?", 3_000);

        assertThat(excerpt.length()).isLessThanOrEqualTo(3_000);
        assertThat(excerpt).contains("3:00 fala numero 18");
    }

    @Test
    void aLongParagraphIsCutAtAWordAndKeepsItsTime() {
        String transcript = "(0:00) " + "abc ".repeat(600) + "\n(5:00) " + "def ".repeat(600);

        int[] starts = BlockTranscripts.chunkStarts(java.util.List.of(
                "(0:00) abc abc", "abc abc abc", "(5:00) def def", "def def"));

        assertThat(starts).containsExactly(0, 0, 300, 300);
        assertThat(BlockTranscripts.excerpt(transcript, "minuto 5", 2_000)).contains("(5:00) def");
    }

    @Test
    void stopwordsAndShortWordsAreNotSearchTerms() {
        assertThat(BlockTranscripts.queryTerms("quero a aula sobre o video")).isEmpty();
        assertThat(BlockTranscripts.queryTerms("como funciona o laço while")).contains("func", "laco", "whil");
    }

    @Test
    void emptyInputsGiveNothing() {
        assertThat(BlockTranscripts.excerpt(null, "x", 100)).isEmpty();
        assertThat(BlockTranscripts.excerpt("texto", "x", 0)).isEmpty();
        assertThat(BlockTranscripts.excerpt("   ", "x", 100)).isEmpty();
    }

    /** {@code total} lines of filler with one distinctive line ({@code needle}) at line {@code needleAt}. */
    private static String longTranscript(int total, String filler, int needleAt, String needle) {
        List<String> lines = IntStream.range(0, total)
                .mapToObj(i -> "%d:%02d %s".formatted(i / 6, (i % 6) * 10, i == needleAt ? needle : filler + " " + "blablabla ".repeat(12)))
                .toList();
        return String.join("\n", lines);
    }
}

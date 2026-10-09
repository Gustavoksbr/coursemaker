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

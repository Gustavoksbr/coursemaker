package com.coursemaker.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Video transcripts, as the author pastes them (the YouTube "Show transcript" panel, or an .srt/.vtt file).
 * They are long - a 15-minute video is some 12,000 characters - and the AI assistant can only take a few
 * thousand per question, so {@link #excerpt} picks the stretches that best match the question. Pure
 * functions, no I/O.
 */
final class BlockTranscripts {

    /** Longest stretch kept together when a transcript is cut into pieces. */
    static final int CHUNK_CHARS = 900;

    private static final Pattern TIMESTAMP_LINE = Pattern.compile("^\\d{1,2}(:\\d{2}){1,2}$");
    private static final Pattern CUE_TIMING = Pattern.compile(
            "^(?:(\\d{1,2}):)?(\\d{1,2}):(\\d{2})[.,]\\d{1,3}\\s*-->.*$");
    private static final Pattern CUE_INDEX = Pattern.compile("^\\d+$");
    /** A clock time anywhere in the text: "6:00", "(6:00)", "1:02:03". */
    private static final Pattern TIME_IN_TEXT = Pattern.compile("(?<![\\d:])(?:(\\d{1,2}):)?(\\d{1,2}):(\\d{2})(?![\\d:])");
    /** "minuto 6", "no minuto  6", "min 6". */
    private static final Pattern MINUTE_AFTER_WORD = Pattern.compile("\\bmin(?:utos?)?\\.?\\s*(?:de|do|no|aos|em)?\\s*(\\d{1,3})\\b");
    /** "aos 6 minutos", "6 min". */
    private static final Pattern MINUTE_BEFORE_WORD = Pattern.compile("\\b(\\d{1,3})\\s*min(?:utos?)?\\b");
    private static final Pattern WORDS = Pattern.compile("[^\\p{L}\\p{N}]+");
    private static final Pattern MARKS = Pattern.compile("\\p{M}+");

    /** Words that say nothing about WHICH part of a video the student means. */
    private static final Set<String> STOPWORDS = Set.of(
            "sobre", "esta", "este", "esse", "essa", "isso", "isto", "aula", "video", "qual", "quais", "como",
            "para", "porque", "onde", "quando", "fala", "falou", "falar", "diz", "disse", "explique", "explica",
            "resuma", "resumo", "professor", "minuto", "minutos", "momento", "parte", "pode", "poderia", "quero",
            "gostaria", "entendi", "entender", "mais", "muito", "tem", "foi", "que", "uma", "uns", "umas",
            "dos", "das", "nos", "nas", "pelo", "pela", "com", "sem", "por", "seu", "sua", "nao", "sim");

    private BlockTranscripts() {
    }

    /**
     * What gets stored: text only (no NULs, which Postgres refuses, and no stray control characters), trimmed;
     * blank means "no transcript" and comes back as null.
     */
    static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String cleaned = raw.replace("\r\n", "\n").replace('\r', '\n')
                .replaceAll("[\\p{Cntrl}&&[^\\n\\t]]", "")
                .strip();
        return cleaned.isEmpty() ? null : cleaned;
    }

    /**
     * One line per spoken passage, each with its time when there is one. The YouTube panel copies as a
     * timestamp line followed by a text line, and subtitle files add cue numbers and
     * {@code 00:00:01,000 --> 00:00:04,000} lines; all of that becomes {@code "1:05 text"}.
     */
    static List<String> compact(String transcript) {
        List<String> lines = new ArrayList<>();
        String pendingTime = null;
        for (String raw : transcript.split("\n")) {
            String line = raw.strip();
            if (line.isEmpty() || line.equals("WEBVTT")) {
                continue;
            }
            var cue = CUE_TIMING.matcher(line);
            if (cue.matches()) {
                pendingTime = clock(cue.group(1), cue.group(2), cue.group(3));
                continue;
            }
            if (CUE_INDEX.matcher(line).matches() && pendingTime == null) {
                // A subtitle cue number (its timing line comes next); a bare number in a pasted transcript is
                // rare enough to lose.
                continue;
            }
            if (TIMESTAMP_LINE.matcher(line).matches()) {
                pendingTime = line;
                continue;
            }
            lines.add(pendingTime == null ? line : pendingTime + " " + line);
            pendingTime = null;
        }
        return lines;
    }

    private static String clock(String hours, String minutes, String seconds) {
        int h = hours == null ? 0 : Integer.parseInt(hours);
        int m = Integer.parseInt(minutes);
        return h > 0 ? "%d:%02d:%s".formatted(h, m, seconds) : "%d:%s".formatted(m, seconds);
    }

    /**
     * At most {@code budget} characters of the transcript: all of it when it fits, otherwise the pieces that
     * mention the most words of {@code query}, in video order (a gap is marked with "[...]"). When the
     * question names nothing in particular ("resuma esta aula"), pieces are spread evenly over the video.
     */
    static String excerpt(String transcript, String query, int budget) {
        if (transcript == null || transcript.isBlank() || budget <= 0) {
            return "";
        }
        List<String> lines = compact(transcript);
        String whole = String.join("\n", lines);
        if (whole.length() <= budget) {
            return whole;
        }

        List<String> chunks = chunk(lines);
        int perChunk = CHUNK_CHARS + 6; // room for the "[...]" separator
        int fit = Math.max(1, budget / perChunk);
        if (fit >= chunks.size()) {
            return String.join("\n", chunks);
        }

        // A question about a moment ("o que ele fala no minuto 6?") is answered by the stretch around it: words
        // like "minuto" name nothing in the text, so without this the pieces would be picked blindly.
        List<Integer> chosen = new ArrayList<>();
        int target = queryTime(query);
        if (target >= 0) {
            int[] starts = chunkStarts(chunks);
            // The latest moment written at or before the target, and the FIRST piece that begins there (a long
            // paragraph is cut in several pieces that all inherit its time).
            int bestStart = -1;
            for (int start : starts) {
                if (start <= target) {
                    bestStart = Math.max(bestStart, start);
                }
            }
            int at = 0;
            for (int i = 0; i < starts.length && bestStart >= 0; i++) {
                if (starts[i] == bestStart) {
                    at = i;
                    break;
                }
            }
            int own = fit == 1 ? 1 : (fit + 1) / 2;
            // the piece itself, the one after it (what is said next), the one before, then further out
            for (int step = 0; chosen.size() < own && step < 2 * chunks.size(); step++) {
                int offset = (step + 1) / 2;
                int candidate = step % 2 == 1 ? at + offset : at - offset;
                if (candidate >= 0 && candidate < chunks.size() && !chosen.contains(candidate)) {
                    chosen.add(candidate);
                }
            }
        }

        Set<String> terms = queryTerms(query);
        double[] scores = new double[chunks.size()];
        double best = 0;
        for (int i = 0; i < chunks.size(); i++) {
            scores[i] = score(fold(chunks.get(i)), terms);
            best = Math.max(best, scores[i]);
        }

        if (best > 0) {
            List<Integer> byScore = new ArrayList<>();
            for (int i = 0; i < chunks.size(); i++) {
                if (scores[i] > 0 && !chosen.contains(i)) {
                    byScore.add(i);
                }
            }
            byScore.sort(Comparator.<Integer>comparingDouble(i -> -scores[i]).thenComparingInt(i -> i));
            for (int i : byScore) {
                if (chosen.size() >= fit) {
                    break;
                }
                chosen.add(i);
            }
        } else if (chosen.isEmpty()) {
            // nothing specific asked ("resuma esta aula"): spread over the whole video, first and last piece included
            for (int k = 0; k < fit; k++) {
                chosen.add(fit == 1 ? 0 : (int) Math.round((double) k * (chunks.size() - 1) / (fit - 1)));
            }
        }

        List<Integer> ordered = new ArrayList<>(new LinkedHashSet<>(chosen));
        ordered.sort(Integer::compare);
        StringBuilder sb = new StringBuilder();
        int previous = -2;
        for (int index : ordered) {
            if (previous != -2 && index != previous + 1) {
                sb.append("[...]\n");
            } else if (previous == -2 && index > 0) {
                sb.append("[...]\n");
            }
            sb.append(chunks.get(index)).append('\n');
            previous = index;
        }
        if (previous < chunks.size() - 1) {
            sb.append("[...]\n");
        }
        return sb.toString().strip();
    }

    /**
     * The moment the question points at, in seconds, or -1: "6:30", "minuto 6", "aos 6 minutos". The first one
     * wins, and the new question comes before the one it follows, so it is the one the student means.
     */
    static int queryTime(String query) {
        if (query == null) {
            return -1;
        }
        String text = fold(query);
        var clock = TIME_IN_TEXT.matcher(text);
        if (clock.find()) {
            return seconds(clock.group(1), clock.group(2), clock.group(3));
        }
        var after = MINUTE_AFTER_WORD.matcher(text);
        if (after.find()) {
            return Integer.parseInt(after.group(1)) * 60;
        }
        var before = MINUTE_BEFORE_WORD.matcher(text);
        if (before.find()) {
            return Integer.parseInt(before.group(1)) * 60;
        }
        return -1;
    }

    private static int seconds(String hours, String minutes, String seconds) {
        int h = hours == null ? 0 : Integer.parseInt(hours);
        return h * 3600 + Integer.parseInt(minutes) * 60 + Integer.parseInt(seconds);
    }

    /**
     * When each piece begins, in seconds: the first time written in it, or - for a piece cut out of the middle of
     * a long paragraph - the last time seen before it.
     */
    static int[] chunkStarts(List<String> chunks) {
        int[] starts = new int[chunks.size()];
        int lastSeen = 0;
        for (int i = 0; i < chunks.size(); i++) {
            var matcher = TIME_IN_TEXT.matcher(chunks.get(i));
            boolean first = true;
            int start = lastSeen;
            while (matcher.find()) {
                int at = seconds(matcher.group(1), matcher.group(2), matcher.group(3));
                if (first) {
                    start = at;
                    first = false;
                }
                lastSeen = at;
            }
            starts[i] = start;
        }
        return starts;
    }

    private static List<String> chunk(List<String> lines) {
        List<String> chunks = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String line : lines) {
            String rest = line;
            while (rest.length() > CHUNK_CHARS) {
                if (current.length() > 0) {
                    chunks.add(current.toString());
                    current.setLength(0);
                }
                // cut at a word boundary, not in the middle of a word
                int cut = rest.lastIndexOf(' ', CHUNK_CHARS);
                if (cut < CHUNK_CHARS / 2) {
                    cut = CHUNK_CHARS;
                }
                chunks.add(rest.substring(0, cut).strip());
                rest = rest.substring(cut).strip();
            }
            if (current.length() > 0 && current.length() + 1 + rest.length() > CHUNK_CHARS) {
                chunks.add(current.toString());
                current.setLength(0);
            }
            if (current.length() > 0) {
                current.append('\n');
            }
            current.append(rest);
        }
        if (current.length() > 0) {
            chunks.add(current.toString());
        }
        return chunks;
    }

    /** Lower case, no accents: "Funções" and "funcoes" are the same word. */
    static String fold(String text) {
        return MARKS.matcher(Normalizer.normalize(text.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)).replaceAll("");
    }

    /** The words of the question that can tell one part of a video from another, cut to a 4-letter stem. */
    static Set<String> queryTerms(String query) {
        Set<String> terms = new HashSet<>();
        if (query == null) {
            return terms;
        }
        for (String word : WORDS.split(fold(query))) {
            if (word.length() < 4 || STOPWORDS.contains(word)) {
                continue;
            }
            // "funcao"/"funcoes", "repeticao"/"repetir": comparing 4-letter stems keeps the plural and the verb
            terms.add(word.length() > 4 ? word.substring(0, 4) : word);
        }
        return terms;
    }

    private static double score(String foldedChunk, Set<String> terms) {
        double score = 0;
        for (String term : terms) {
            int at = foldedChunk.indexOf(term);
            if (at < 0) {
                continue;
            }
            score += 1;
            int again = foldedChunk.indexOf(term, at + term.length());
            if (again >= 0) {
                score += 0.25; // mentioned more than once
            }
        }
        return score;
    }
}

package com.coursemaker.service;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Collection;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Turns a human title into a URL-safe slug, pt-BR aware ("Introdução à Programação" ->
 * "introducao-a-programacao"), and resolves collisions with a numeric suffix.
 */
@Service
public class SlugGeneratorService {

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");
    private static final int MAX_LENGTH = 200;

    public String slugify(String input) {
        if (input == null || input.isBlank()) {
            return "sem-titulo";
        }
        // NFD splits "ç" into "c" + cedilla, so stripping the combining marks leaves plain ASCII.
        String normalized = Normalizer.normalize(input.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase(PT_BR);

        String slug = normalized
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");

        if (slug.length() > MAX_LENGTH) {
            slug = slug.substring(0, MAX_LENGTH).replaceAll("-+$", "");
        }
        return slug.isEmpty() ? "sem-titulo" : slug;
    }

    /**
     * Returns {@code base} if it is free, otherwise {@code base-2}, {@code base-3}, ... The caller
     * passes every slug already starting with {@code base} for that owner, so this needs no extra
     * round-trip per attempt.
     */
    public String uniqueSlug(String desired, Collection<String> taken) {
        String base = slugify(desired);
        Set<String> existing = new HashSet<>(taken);
        if (!existing.contains(base)) {
            return base;
        }
        int suffix = 2;
        while (existing.contains(base + "-" + suffix)) {
            suffix++;
        }
        return base + "-" + suffix;
    }
}

package com.coursemaker.service;

import com.coursemaker.domain.enums.BlockType;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

/**
 * Strips anything script-like from rich-text blocks before they are stored.
 *
 * <p>The frontend also sanitises with DOMPurify at render time, but that only protects <em>our</em>
 * renderer: content is also served over the API, so it has to be safe at rest. Only
 * {@link BlockType#TEXT} carries HTML; code blocks are stored verbatim (they are rendered as text
 * by Shiki) and image/video blocks are plain URLs.
 */
@Component
public class HtmlSanitizer {

    private static final Safelist SAFELIST = Safelist.relaxed()
            .addAttributes("code", "class")          // Tiptap marks the language on <code class="language-x">
            .addAttributes("pre", "class")
            .addAttributes("span", "class")
            .addAttributes("a", "target", "rel")
            .addAttributes("img", "loading")
            .addProtocols("img", "src", "http", "https", "data")
            .addProtocols("a", "href", "http", "https", "mailto");

    private static final Document.OutputSettings OUTPUT_SETTINGS =
            new Document.OutputSettings().prettyPrint(false);

    public String sanitize(BlockType type, String content) {
        if (content == null) {
            return null;
        }
        if (type != BlockType.TEXT) {
            return content.trim();
        }
        return Jsoup.clean(content, "", SAFELIST, OUTPUT_SETTINGS);
    }
}

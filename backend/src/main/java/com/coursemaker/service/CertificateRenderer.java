package com.coursemaker.service;

import com.openhtmltopdf.extend.FSSupplier;
import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.openhtmltopdf.svgsupport.BatikSVGDrawer;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Renders a completion certificate to PDF from an XHTML template. Fonts are bundled under
 * {@code resources/fonts} (Inter and Playfair Display, both OFL-licensed) since the PDF renderer
 * has no network access at render time and cannot pull them from Google Fonts the way a browser
 * would. Playfair Display ships here as its variable-font file: openhtmltopdf/PDFBox render it
 * using its default (regular-weight) instance regardless of the requested CSS weight, which is why
 * the template leans on size, italics and Inter's real static weights for hierarchy rather than a
 * "bold serif".
 */
@Component
public class CertificateRenderer {

    private static final String INK = "#241c10";
    private static final String BODY = "#4a4335";
    private static final String MUTED = "#8c8370";
    private static final String ACCENT = "#0ea5e9";
    private static final String BG = "#fbf7ee";

    private static final String GRADUATION_CAP_SVG = """
            <svg viewBox="0 0 24 24" fill="none" stroke="%s" stroke-width="1.6" \
            stroke-linecap="round" stroke-linejoin="round">\
            <path d="M12 3 1 8l11 5 9-4.09V17h2V8L12 3z"/>\
            <path d="M5 10.18v4.32c0 1 3.13 3 7 3s7-2 7-3v-4.32"/>\
            </svg>""".formatted(ACCENT);

    /** Everything the template needs; `kindArticle` is pre-resolved ("o curso" / "a trilha"). */
    public record CertificateData(
            String studentName, String kindArticle, String contentName, String ownerName, String completionDate) {
    }

    public byte[] render(CertificateData data) {
        String html = buildHtml(data);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.useSVGDrawer(new BatikSVGDrawer());
            registerFonts(builder);
            builder.withHtmlContent(html, null);
            builder.toStream(out);
            builder.run();
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Nao foi possivel gerar o certificado", e);
        }
    }

    private void registerFonts(PdfRendererBuilder builder) {
        builder.useFont(font("Inter-Regular.ttf"), "Inter", 400, FontStyle.NORMAL, true);
        builder.useFont(font("Inter-Medium.ttf"), "Inter", 500, FontStyle.NORMAL, true);
        builder.useFont(font("Inter-SemiBold.ttf"), "Inter", 600, FontStyle.NORMAL, true);
        builder.useFont(font("Inter-Bold.ttf"), "Inter", 700, FontStyle.NORMAL, true);
        // Not subset: subsetting a variable font's extra tables (fvar/gvar/STAT) is a rougher path
        // in PDFBox than for a plain static font, so these embed in full instead.
        builder.useFont(font("PlayfairDisplay-Regular.ttf"), "Playfair Display", 400, FontStyle.NORMAL, false);
        builder.useFont(font("PlayfairDisplay-Italic.ttf"), "Playfair Display", 400, FontStyle.ITALIC, false);
    }

    private FSSupplier<InputStream> font(String filename) {
        return () -> getClass().getResourceAsStream("/fonts/" + filename);
    }

    private String buildHtml(CertificateData data) {
        String cap = GRADUATION_CAP_SVG;
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <html xmlns="http://www.w3.org/1999/xhtml">
                <head>
                <style>
                  @page { size: 1056px 816px; margin: 0; }
                  * { box-sizing: border-box; }
                  body { margin: 0; }
                  .sheet {
                    width: 1056px; height: 816px; position: relative; background: %s;
                    font-family: 'Inter';
                  }
                  .frame-outer {
                    position: absolute; top: 34px; right: 34px; bottom: 34px; left: 34px;
                    border: 2px solid %s;
                  }
                  .frame-inner {
                    position: absolute; top: 44px; right: 44px; bottom: 44px; left: 44px;
                    border: 1px solid %s;
                  }
                  .corner {
                    position: absolute; width: 9px; height: 9px; background: %s;
                    -fs-transform: rotate(45deg);
                  }
                  .corner-tl { top: 30px; left: 30px; }
                  .corner-tr { top: 30px; right: 30px; }
                  .corner-bl { bottom: 30px; left: 30px; }
                  .corner-br { bottom: 30px; right: 30px; }
                  .content {
                    position: absolute; top: 44px; right: 44px; bottom: 44px; left: 44px;
                    padding: 56px 96px;
                  }
                  .brand { text-align: center; }
                  .brand-badge {
                    width: 60px; height: 60px; border-radius: 999px; border: 1.5px solid %s;
                    margin: 0 auto 10px auto; text-align: center; padding-top: 16px;
                  }
                  .brand-badge svg { width: 28px; height: 28px; }
                  .brand-name {
                    font-family: 'Inter'; font-weight: 600; font-size: 13px; letter-spacing: 4px; color: %s;
                  }
                  .title-block { text-align: center; margin-top: 46px; }
                  .eyebrow {
                    font-family: 'Inter'; font-weight: 600; font-size: 13px; letter-spacing: 5px; color: %s;
                    margin-bottom: 14px;
                  }
                  .lead { font-family: 'Inter'; font-size: 15px; letter-spacing: 1.5px; color: %s; }
                  .student-name {
                    font-family: 'Playfair Display'; font-size: 54px; color: %s; margin-top: 30px;
                    line-height: 1.15;
                  }
                  .rule { width: 90px; height: 2px; background: %s; margin: 12px auto 0 auto; }
                  .sentence {
                    font-family: 'Inter'; font-size: 18px; line-height: 1.8; color: %s; margin-top: 30px;
                  }
                  .content-name { font-family: 'Playfair Display'; font-style: italic; color: %s; }
                  .owner-name { font-family: 'Inter'; font-weight: 600; color: %s; }
                  .footer { position: absolute; left: 96px; right: 96px; bottom: 56px; }
                  .footer-col-left { position: absolute; left: 0; bottom: 0; width: 220px; }
                  .footer-col-right { position: absolute; right: 0; bottom: 0; width: 220px; text-align: center; }
                  .footer-rule { border-top: 1px solid %s; opacity: 0.5; margin-bottom: 6px; }
                  .footer-label {
                    font-family: 'Inter'; font-size: 11px; letter-spacing: 2px; color: %s; text-transform: uppercase;
                  }
                  .footer-value { font-family: 'Inter'; font-weight: 500; font-size: 15px; color: %s; margin-top: 4px; }
                  .footer-badge svg { width: 22px; height: 22px; margin-bottom: 6px; }
                </style>
                </head>
                <body>
                  <div class="sheet">
                    <div class="frame-outer"></div>
                    <div class="frame-inner"></div>
                    <div class="corner corner-tl"></div>
                    <div class="corner corner-tr"></div>
                    <div class="corner corner-bl"></div>
                    <div class="corner corner-br"></div>

                    <div class="content">
                      <div class="brand">
                        <div class="brand-badge">%s</div>
                        <div class="brand-name">COURSEMAKER</div>
                      </div>

                      <div class="title-block">
                        <div class="eyebrow">CERTIFICADO DE CONCLUSAO</div>
                        <div class="lead">Certificamos que</div>
                        <div class="student-name">%s</div>
                        <div class="rule"></div>
                        <div class="sentence">
                          concluiu com exito %s <span class="content-name">%s</span><br/>
                          criado por <span class="owner-name">%s</span>
                        </div>
                      </div>

                      <div class="footer">
                        <div class="footer-col-left">
                          <div class="footer-rule"></div>
                          <div class="footer-label">Data de conclusao</div>
                          <div class="footer-value">%s</div>
                        </div>
                        <div class="footer-col-right">
                          <div class="footer-badge">%s</div>
                          <div class="footer-rule"></div>
                          <div class="footer-label">CourseMaker</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(
                BG, INK, ACCENT, ACCENT,
                ACCENT, INK,
                MUTED, MUTED, INK, ACCENT, BODY, INK, INK,
                MUTED, MUTED, INK,
                cap,
                esc(data.studentName()),
                esc(data.kindArticle()), esc(data.contentName()),
                esc(data.ownerName()),
                esc(data.completionDate()),
                cap);
    }

    private static String esc(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}

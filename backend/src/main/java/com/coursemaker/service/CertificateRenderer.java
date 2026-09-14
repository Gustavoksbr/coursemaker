package com.coursemaker.service;

import com.openhtmltopdf.extend.FSSupplier;
import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.openhtmltopdf.svgsupport.BatikSVGDrawer;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Renders a completion certificate to PDF from an XHTML template. Fonts are bundled under
 * {@code resources/fonts} (Inter, Playfair Display and Dancing Script, all OFL-licensed) since the
 * PDF renderer has no network access at render time and cannot pull them from Google Fonts the way
 * a browser would. Playfair Display ships here as its variable-font file: openhtmltopdf/PDFBox
 * render it using its default (regular-weight) instance regardless of the requested CSS weight,
 * which is why the template leans on size, italics and Inter's real static weights for hierarchy
 * rather than a "bold serif".
 */
@Component
public class CertificateRenderer {

    private static final String INK = "#241c10";
    private static final String BODY = "#4a4335";
    private static final String MUTED = "#8c8370";
    private static final String ACCENT = "#0ea5e9";
    private static final String BG = "#fbf7ee";

    /** Mirrors {@code frontend/public/favicon.svg} - keep the two in sync if the mark changes. */
    private static final String FAVICON_SVG = """
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">\
            <rect width="32" height="32" rx="7" fill="#0ea5e9"/>\
            <path d="M16 7 4.5 12.5 16 18l11.5-5.5L16 7Z" fill="#fff"/>\
            <path d="M9 15.6v5.1c0 2.1 3.1 3.8 7 3.8s7-1.7 7-3.8v-5.1l-7 3.4-7-3.4Z" fill="#fff" opacity=".75"/>\
            </svg>""";

    /**
     * Everything the template needs; `kindArticle` is pre-resolved ("o curso" / "a trilha").
     * `contentUrl` is the content's public page - shown small in the footer, and not guaranteed to
     * resolve yet on a certificate generated against a not-yet-deployed backend.
     */
    public record CertificateData(
            String studentName, String kindArticle, String contentName, String ownerName, String completionDate,
            String contentUrl) {
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

    /**
     * The same certificate as {@link #render}, rasterized to a PNG - lets the library show it
     * inline before the visitor commits to downloading the PDF. Nothing is cached or persisted:
     * this re-renders and re-rasterizes on every call, same "always fresh, nothing to keep in sync"
     * choice as the PDF itself (see CertificateService).
     */
    public byte[] renderPreviewPng(CertificateData data) {
        byte[] pdf = render(data);
        try (PDDocument document = PDDocument.load(pdf); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDFRenderer renderer = new PDFRenderer(document);
            // 2x the PDF's 96dpi baseline: sharp enough to fill a wide preview card without the
            // multi-megabyte cost of going much higher for something nobody prints from this view.
            BufferedImage image = renderer.renderImageWithDPI(0, 192, ImageType.RGB);
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Nao foi possivel gerar a previa do certificado", e);
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
        builder.useFont(font("DancingScript-Bold.ttf"), "Dancing Script", 700, FontStyle.NORMAL, false);
    }

    private FSSupplier<InputStream> font(String filename) {
        return () -> getClass().getResourceAsStream("/fonts/" + filename);
    }

    private String buildHtml(CertificateData data) {
        String favicon = FAVICON_SVG;
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
                    padding: 40px 96px;
                  }
                  .brand { text-align: center; }
                  .brand-badge { width: 52px; height: 52px; margin: 0 auto 10px auto; }
                  .brand-badge svg { width: 52px; height: 52px; }
                  .brand-name {
                    font-family: 'Inter'; font-weight: 600; font-size: 13px; letter-spacing: 4px; color: %s;
                  }
                  .title-block { text-align: center; margin-top: 32px; }
                  .eyebrow {
                    font-family: 'Inter'; font-weight: 600; font-size: 13px; letter-spacing: 5px; color: %s;
                    margin-bottom: 14px;
                  }
                  .lead { font-family: 'Inter'; font-size: 15px; letter-spacing: 1.5px; color: %s; }
                  .student-name {
                    font-family: 'Playfair Display'; font-size: 48px; color: %s; margin-top: 22px;
                    line-height: 1.15;
                  }
                  .rule { width: 90px; height: 2px; background: %s; margin: 10px auto 0 auto; }
                  .sentence {
                    font-family: 'Inter'; font-size: 17px; line-height: 1.7; color: %s; margin-top: 22px;
                  }
                  .content-name { font-family: 'Playfair Display'; font-style: italic; color: %s; }
                  .owner-name { font-family: 'Inter'; font-weight: 600; color: %s; }
                  .signature { text-align: center; margin-top: 28px; }
                  .signature-name { font-family: 'Dancing Script'; font-weight: 700; font-size: 38px; color: %s; }
                  .signature-rule { width: 210px; height: 1px; background: %s; margin: 0 auto 8px auto; }
                  .signature-role {
                    font-family: 'Inter'; font-size: 11px; letter-spacing: 2px; color: %s; text-transform: uppercase;
                  }
                  .signature-company { font-family: 'Inter'; font-weight: 600; font-size: 14px; color: %s; margin-top: 2px; }
                  /* A CSS table, not absolute positioning: this engine's support for "position:
                     absolute; bottom: N" boxes that must grow upward from an unset top is shaky,
                     and silently produced overlapping text instead of a layout error. A table row
                     cannot overlap the flow content above it, so it is the safer choice here. */
                  .footer { display: table; width: 100%%; table-layout: fixed; margin-top: 32px; }
                  .footer-col-left { display: table-cell; width: 50%%; vertical-align: top; }
                  .footer-col-right { display: table-cell; width: 50%%; text-align: right; vertical-align: top; }
                  .footer-rule { border-top: 1px solid %s; opacity: 0.5; margin-bottom: 6px; }
                  .footer-label {
                    font-family: 'Inter'; font-size: 11px; letter-spacing: 2px; color: %s; text-transform: uppercase;
                  }
                  .footer-value { font-family: 'Inter'; font-weight: 500; font-size: 15px; color: %s; margin-top: 4px; }
                  .footer-url {
                    font-family: 'Inter'; font-size: 10px; color: %s; margin-top: 4px; word-break: break-all;
                  }
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
                          concluiu com êxito %s <span class="content-name">%s</span><br/>
                          criado por <span class="owner-name">%s</span>
                        </div>
                      </div>

                      <div class="signature">
                        <div class="signature-name">CourseMaker</div>
                        <div class="signature-rule"></div>
                        <div class="signature-role">Empresa</div>
                        <div class="signature-company">CourseMaker</div>
                      </div>

                      <div class="footer">
                        <div class="footer-col-left">
                          <div class="footer-rule"></div>
                          <div class="footer-label">Data de conclusao</div>
                          <div class="footer-value">%s</div>
                        </div>
                        <div class="footer-col-right">
                          <div class="footer-rule"></div>
                          <div class="footer-label">Link do conteudo</div>
                          <div class="footer-url">%s</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(
                BG, INK, ACCENT, ACCENT,
                INK,
                MUTED, MUTED, INK, ACCENT, BODY, INK, INK,
                INK, MUTED, MUTED, INK,
                MUTED, MUTED, INK, MUTED,
                favicon,
                esc(data.studentName()),
                esc(data.kindArticle()), esc(data.contentName()),
                esc(data.ownerName()),
                esc(data.completionDate()),
                esc(data.contentUrl()));
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

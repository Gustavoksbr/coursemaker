package com.coursemaker.dto.home;

import com.coursemaker.domain.entity.SiteSettings;
import com.coursemaker.domain.entity.Testimonial;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/** Requests and responses for the admin-editable landing page: copy, testimonials and counters. */
public final class HomeDtos {

    private HomeDtos() {
    }

    // --------------------------------------------------------------- settings

    public record SiteSettingsResponse(
            String heroTitle,
            String heroHighlight,
            String heroSubtitle,
            String heroCtaLabel,
            String heroCtaHref,
            String announcement,
            String announcementHref) {

        public static SiteSettingsResponse from(SiteSettings settings) {
            return new SiteSettingsResponse(
                    settings.getHeroTitle(),
                    settings.getHeroHighlight(),
                    settings.getHeroSubtitle(),
                    settings.getHeroCtaLabel(),
                    settings.getHeroCtaHref(),
                    settings.getAnnouncement(),
                    settings.getAnnouncementHref());
        }
    }

    /** Full replace rather than partial: the admin form always submits every field. */
    public record UpdateSiteSettingsRequest(
            @Size(max = 200) String heroTitle,
            @Size(max = 80) String heroHighlight,
            @Size(max = 400) String heroSubtitle,
            @Size(max = 60) String heroCtaLabel,
            @Size(max = 2000) String heroCtaHref,
            @Size(max = 300) String announcement,
            @Size(max = 2000) String announcementHref) {
    }

    // ----------------------------------------------------------- testimonials

    public record TestimonialResponse(
            UUID id,
            String authorName,
            String authorRole,
            String authorImage,
            String quote,
            int orderIndex,
            boolean published) {

        public static TestimonialResponse from(Testimonial testimonial) {
            return new TestimonialResponse(
                    testimonial.getId(),
                    testimonial.getAuthorName(),
                    testimonial.getAuthorRole(),
                    testimonial.getAuthorImage(),
                    testimonial.getQuote(),
                    testimonial.getOrderIndex(),
                    testimonial.isPublished());
        }
    }

    public record CreateTestimonialRequest(
            @NotBlank @Size(max = 120) String authorName,
            @Size(max = 160) String authorRole,
            @Size(max = 2000) String authorImage,
            @NotBlank @Size(max = 2000) String quote,
            Integer orderIndex,
            Boolean published) {
    }

    /** Partial update: null means "leave unchanged". */
    public record UpdateTestimonialRequest(
            @Size(min = 1, max = 120) String authorName,
            @Size(max = 160) String authorRole,
            @Size(max = 2000) String authorImage,
            @Size(min = 1, max = 2000) String quote,
            Integer orderIndex,
            Boolean published) {
    }

    // ----------------------------------------------------------------- stats

    /** Live counters for the landing page - always computed, never typed in. */
    public record StatsResponse(long courses, long trilhas, long posts, long creators) {
    }
}

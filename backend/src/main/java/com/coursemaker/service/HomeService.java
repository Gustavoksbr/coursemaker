package com.coursemaker.service;

import com.coursemaker.domain.entity.SiteSettings;
import com.coursemaker.domain.entity.Testimonial;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.home.HomeDtos.CreateTestimonialRequest;
import com.coursemaker.dto.home.HomeDtos.SiteSettingsResponse;
import com.coursemaker.dto.home.HomeDtos.StatsResponse;
import com.coursemaker.dto.home.HomeDtos.TestimonialResponse;
import com.coursemaker.dto.home.HomeDtos.UpdateSiteSettingsRequest;
import com.coursemaker.dto.home.HomeDtos.UpdateTestimonialRequest;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.CourseRepository;
import com.coursemaker.repository.PostRepository;
import com.coursemaker.repository.SiteSettingsRepository;
import com.coursemaker.repository.TestimonialRepository;
import com.coursemaker.repository.TrilhaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Everything the landing page needs that is not just a content listing: the admin-editable copy,
 * the testimonial wall, and the live counters.
 *
 * <p>Admin authorisation is the same inline guard used by {@link AreaService} and
 * {@link AdminHomeCurationService} - there is no role-based rule in the security config.
 */
@Service
@RequiredArgsConstructor
public class HomeService {

    private final SiteSettingsRepository settingsRepository;
    private final TestimonialRepository testimonialRepository;
    private final CourseRepository courseRepository;
    private final PostRepository postRepository;
    private final TrilhaRepository trilhaRepository;

    // -------------------------------------------------------------- settings

    @Transactional(readOnly = true)
    public SiteSettingsResponse getSettings() {
        return SiteSettingsResponse.from(loadSettings());
    }

    @Transactional
    public SiteSettingsResponse updateSettings(UpdateSiteSettingsRequest request, User admin) {
        requireAdmin(admin);
        SiteSettings settings = loadSettings();

        settings.setHeroTitle(blankToNull(request.heroTitle()));
        settings.setHeroHighlight(blankToNull(request.heroHighlight()));
        settings.setHeroSubtitle(blankToNull(request.heroSubtitle()));
        settings.setHeroCtaLabel(blankToNull(request.heroCtaLabel()));
        settings.setHeroCtaHref(blankToNull(request.heroCtaHref()));
        settings.setAnnouncement(blankToNull(request.announcement()));
        settings.setAnnouncementHref(blankToNull(request.announcementHref()));

        return SiteSettingsResponse.from(settingsRepository.save(settings));
    }

    /**
     * The row is seeded by the migration, but a database restored from before V20 (or a manual
     * delete) would leave it missing - recreating it beats failing the whole landing page.
     */
    private SiteSettings loadSettings() {
        return settingsRepository.findById(Boolean.TRUE)
                .orElseGet(() -> settingsRepository.save(SiteSettings.builder().id(Boolean.TRUE).build()));
    }

    // ----------------------------------------------------------- testimonials

    @Transactional(readOnly = true)
    public List<TestimonialResponse> listPublished() {
        return testimonialRepository.findByPublishedTrueOrderByOrderIndexAscCreatedAtAsc()
                .stream().map(TestimonialResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<TestimonialResponse> listAll(User admin) {
        requireAdmin(admin);
        return testimonialRepository.findAllByOrderByOrderIndexAscCreatedAtAsc()
                .stream().map(TestimonialResponse::from).toList();
    }

    @Transactional
    public TestimonialResponse create(CreateTestimonialRequest request, User admin) {
        requireAdmin(admin);
        Testimonial testimonial = Testimonial.builder()
                .authorName(request.authorName().trim())
                .authorRole(blankToNull(request.authorRole()))
                .authorImage(blankToNull(request.authorImage()))
                .quote(request.quote().trim())
                .orderIndex(request.orderIndex() == null ? 0 : request.orderIndex())
                .published(request.published() == null || request.published())
                .build();
        return TestimonialResponse.from(testimonialRepository.save(testimonial));
    }

    @Transactional
    public TestimonialResponse update(UUID id, UpdateTestimonialRequest request, User admin) {
        requireAdmin(admin);
        Testimonial testimonial = testimonialRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Depoimento"));

        if (request.authorName() != null) {
            testimonial.setAuthorName(request.authorName().trim());
        }
        if (request.authorRole() != null) {
            testimonial.setAuthorRole(blankToNull(request.authorRole()));
        }
        if (request.authorImage() != null) {
            testimonial.setAuthorImage(blankToNull(request.authorImage()));
        }
        if (request.quote() != null) {
            testimonial.setQuote(request.quote().trim());
        }
        if (request.orderIndex() != null) {
            testimonial.setOrderIndex(request.orderIndex());
        }
        if (request.published() != null) {
            testimonial.setPublished(request.published());
        }
        return TestimonialResponse.from(testimonialRepository.save(testimonial));
    }

    @Transactional
    public void delete(UUID id, User admin) {
        requireAdmin(admin);
        Testimonial testimonial = testimonialRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Depoimento"));
        testimonialRepository.delete(testimonial);
    }

    // ----------------------------------------------------------------- stats

    @Transactional(readOnly = true)
    public StatsResponse stats() {
        return new StatsResponse(
                courseRepository.countPublished(),
                trilhaRepository.countPublished(),
                postRepository.countPublished(),
                courseRepository.countCreators());
    }

    // --------------------------------------------------------------- helpers

    private void requireAdmin(User user) {
        if (!user.isAdmin()) {
            throw new ForbiddenException("Apenas administradores podem editar a home");
        }
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}

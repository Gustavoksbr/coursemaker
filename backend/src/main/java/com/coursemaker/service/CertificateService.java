package com.coursemaker.service;

import com.coursemaker.domain.entity.CompositeIds.UserCourseId;
import com.coursemaker.domain.entity.CompositeIds.UserTrilhaId;
import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.Trilha;
import com.coursemaker.domain.entity.User;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.CourseRepository;
import com.coursemaker.repository.EnrollmentRepository;
import com.coursemaker.repository.LessonCompletionRepository;
import com.coursemaker.repository.TrilhaEnrollmentRepository;
import com.coursemaker.repository.TrilhaItemCompletionRepository;
import com.coursemaker.repository.TrilhaRepository;
import com.coursemaker.service.CertificateRenderer.CertificateData;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

/**
 * Issues a completion certificate for a course or a trilha - only once the requesting user has
 * actually finished it (see {@link EnrollmentService#isCourseCompletedByUser} /
 * {@link TrilhaService#isTrilhaCompletedByUser}). Nothing about a certificate is persisted: it is
 * rebuilt on every download from the same underlying enrollment/completion rows, so there is
 * nothing to keep in sync and no "certificate" table to migrate later.
 */
@Service
@RequiredArgsConstructor
public class CertificateService {

    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");
    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("d 'de' MMMM 'de' yyyy", new Locale("pt", "BR"));

    private final CourseRepository courseRepository;
    private final TrilhaRepository trilhaRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final TrilhaEnrollmentRepository trilhaEnrollmentRepository;
    private final EnrollmentService enrollmentService;
    private final TrilhaService trilhaService;
    private final LessonCompletionRepository lessonCompletionRepository;
    private final TrilhaItemCompletionRepository trilhaItemCompletionRepository;
    private final CertificateRenderer renderer;

    @Value("${app.public-url}")
    private String publicUrl;

    @Transactional(readOnly = true)
    public byte[] generateCourseCertificate(UUID courseId, User user) {
        return renderer.render(courseCertificateData(courseId, user));
    }

    /** Same eligibility rule and data as {@link #generateCourseCertificate}, rasterized to PNG. */
    @Transactional(readOnly = true)
    public byte[] generateCourseCertificatePreview(UUID courseId, User user) {
        return renderer.renderPreviewPng(courseCertificateData(courseId, user));
    }

    @Transactional(readOnly = true)
    public byte[] generateTrilhaCertificate(UUID trilhaId, User user) {
        return renderer.render(trilhaCertificateData(trilhaId, user));
    }

    /** Same eligibility rule and data as {@link #generateTrilhaCertificate}, rasterized to PNG. */
    @Transactional(readOnly = true)
    public byte[] generateTrilhaCertificatePreview(UUID trilhaId, User user) {
        return renderer.renderPreviewPng(trilhaCertificateData(trilhaId, user));
    }

    private CertificateData courseCertificateData(UUID courseId, User user) {
        Course course = courseRepository.findByIdWithOwner(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Curso"));

        boolean enrolled = enrollmentRepository.existsById(new UserCourseId(user.getId(), courseId));
        if (!enrolled || !enrollmentService.isCourseCompletedByUser(course, user)) {
            throw new ForbiddenException("Voce ainda nao concluiu este curso");
        }

        Instant completedAt = lessonCompletionRepository.findLatestCompletionAt(user.getId(), courseId);
        return new CertificateData(
                user.getName(),
                "o curso",
                course.getName(),
                course.getOwner().getName(),
                formatDate(completedAt),
                contentUrl("courses", course.getOwner().getNickname(), course.getSlug()));
    }

    private CertificateData trilhaCertificateData(UUID trilhaId, User user) {
        Trilha trilha = trilhaRepository.findByIdWithOwner(trilhaId)
                .orElseThrow(() -> ResourceNotFoundException.of("Trilha"));

        boolean following = trilhaEnrollmentRepository.existsById(new UserTrilhaId(user.getId(), trilhaId));
        if (!following || !trilhaService.isTrilhaCompletedByUser(trilha, user)) {
            throw new ForbiddenException("Voce ainda nao concluiu esta trilha");
        }

        Instant completedAt = trilhaItemCompletionRepository.findLatestCompletionAt(user.getId(), trilhaId);
        return new CertificateData(
                user.getName(),
                "a trilha",
                trilha.getTitle(),
                trilha.getOwner().getName(),
                formatDate(completedAt),
                contentUrl("trilhas", trilha.getOwner().getNickname(), trilha.getSlug()));
    }

    /** Mirrors `contentLinks.js` on the frontend: /courses|trilhas/:nickname/:slug. */
    private String contentUrl(String kindSegment, String nickname, String slug) {
        return "%s/%s/%s/%s".formatted(publicUrl, kindSegment, nickname, slug);
    }

    private String formatDate(Instant instant) {
        Instant effective = instant != null ? instant : Instant.now();
        return ZonedDateTime.ofInstant(effective, ZONE).format(DATE_FORMAT);
    }
}

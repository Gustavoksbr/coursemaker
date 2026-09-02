package com.coursemaker.service;

import com.coursemaker.domain.entity.CompositeIds.SchoolUserId;
import com.coursemaker.domain.entity.School;
import com.coursemaker.domain.entity.SchoolMember;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.school.SchoolDtos.CreateSchoolRequest;
import com.coursemaker.dto.school.SchoolDtos.SchoolSummary;
import com.coursemaker.dto.school.SchoolDtos.SchoolWithMembers;
import com.coursemaker.dto.school.SchoolDtos.UpdateSchoolRequest;
import com.coursemaker.dto.user.UserSummary;
import com.coursemaker.exception.ApiExceptions.ConflictException;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.SchoolMemberRepository;
import com.coursemaker.repository.SchoolRepository;
import com.coursemaker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Schools are provenance, not partnership: an admin curates the list and decides who may publish
 * under each one (via {@link SchoolMember}); the owner of a course/post/trilha then just picks one
 * of the schools they were granted, or none at all - school is always optional on content, unlike
 * area.
 */
@Service
@RequiredArgsConstructor
public class SchoolService {

    private final SchoolRepository schoolRepository;
    private final SchoolMemberRepository schoolMemberRepository;
    private final UserRepository userRepository;
    private final SlugGeneratorService slugGenerator;

    // ------------------------------------------------------------------ reads

    @Transactional(readOnly = true)
    public List<SchoolSummary> list() {
        return schoolRepository.findAllByOrderByNameAsc().stream().map(SchoolSummary::from).toList();
    }

    @Transactional(readOnly = true)
    public SchoolSummary getBySlug(String slug) {
        return SchoolSummary.from(schoolRepository.findBySlug(slug)
                .orElseThrow(() -> ResourceNotFoundException.of("Escola")));
    }

    /** The schools this user is allowed to publish under - feeds the content editor's school picker. */
    @Transactional(readOnly = true)
    public List<SchoolSummary> listMine(User user) {
        List<UUID> schoolIds = schoolMemberRepository.findSchoolIdsByUserId(user.getId());
        if (schoolIds.isEmpty()) {
            return List.of();
        }
        return schoolRepository.findAllById(schoolIds).stream()
                .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
                .map(SchoolSummary::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public SchoolWithMembers getWithMembers(UUID id, User admin) {
        requireAdmin(admin);
        School school = schoolRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Escola"));
        List<UUID> memberIds = schoolMemberRepository.findUserIdsBySchoolId(id);
        List<UserSummary> members = userRepository.findAllById(memberIds).stream()
                .map(UserSummary::from)
                .toList();
        return new SchoolWithMembers(SchoolSummary.from(school), members);
    }

    // ----------------------------------------------------------------- writes

    @Transactional
    public SchoolSummary create(CreateSchoolRequest request, User admin) {
        requireAdmin(admin);
        String name = request.name().trim();
        if (schoolRepository.existsByName(name)) {
            throw new ConflictException("Ja existe uma escola com esse nome");
        }
        List<String> existingSlugs = schoolRepository.findAll().stream().map(School::getSlug).toList();
        String slug = slugGenerator.uniqueSlug(name, existingSlugs);

        School school = School.builder()
                .name(name)
                .slug(slug)
                .description(blankToNull(request.description()))
                .logoUrl(blankToNull(request.logoUrl()))
                .websiteUrl(blankToNull(request.websiteUrl()))
                .build();
        return SchoolSummary.from(schoolRepository.save(school));
    }

    @Transactional
    public SchoolSummary update(UUID id, UpdateSchoolRequest request, User admin) {
        requireAdmin(admin);
        School school = schoolRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Escola"));

        String name = request.name().trim();
        if (!name.equalsIgnoreCase(school.getName()) && schoolRepository.existsByName(name)) {
            throw new ConflictException("Ja existe uma escola com esse nome");
        }
        school.setName(name);
        school.setDescription(blankToNull(request.description()));
        school.setLogoUrl(blankToNull(request.logoUrl()));
        school.setWebsiteUrl(blankToNull(request.websiteUrl()));
        return SchoolSummary.from(schoolRepository.save(school));
    }

    /** Admin-only "show on the home page" toggle - see {@code School.featuredOnHome}. */
    @Transactional
    public SchoolSummary toggleFeaturedOnHome(UUID id, User admin) {
        requireAdmin(admin);
        School school = schoolRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Escola"));
        school.setFeaturedOnHome(!school.isFeaturedOnHome());
        return SchoolSummary.from(schoolRepository.save(school));
    }

    @Transactional
    public void delete(UUID id, User admin) {
        requireAdmin(admin);
        School school = schoolRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Escola"));
        // Content keeps existing but loses the attribution (ON DELETE SET NULL in the schema) -
        // school is optional provenance, not something that should block a deletion.
        schoolRepository.delete(school);
    }

    // -------------------------------------------------------------- members

    @Transactional
    public void grantMembership(UUID schoolId, UUID userId, User admin) {
        requireAdmin(admin);
        if (!schoolRepository.existsById(schoolId)) {
            throw ResourceNotFoundException.of("Escola");
        }
        if (!userRepository.existsById(userId)) {
            throw ResourceNotFoundException.of("Usuario");
        }
        SchoolUserId id = new SchoolUserId(schoolId, userId);
        if (!schoolMemberRepository.existsById(id)) {
            schoolMemberRepository.save(SchoolMember.of(schoolId, userId));
        }
    }

    @Transactional
    public void revokeMembership(UUID schoolId, UUID userId, User admin) {
        requireAdmin(admin);
        schoolMemberRepository.deleteById(new SchoolUserId(schoolId, userId));
    }

    // ---------------------------------------------------------------- helpers

    /**
     * The authorization rule shared by Course/Post/TrilhaService: a {@code null} school is always
     * allowed (school is optional on every content type); a non-null one requires the author to
     * have been granted membership of it by an admin.
     */
    @Transactional(readOnly = true)
    public School requireAllowedSchool(UUID schoolId, User author) {
        if (schoolId == null) {
            return null;
        }
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> ResourceNotFoundException.of("Escola"));
        boolean member = schoolMemberRepository.existsById(new SchoolUserId(schoolId, author.getId()));
        if (!member) {
            throw new ForbiddenException("Voce nao tem permissao para publicar conteudo desta escola");
        }
        return school;
    }

    private void requireAdmin(User user) {
        if (!user.isAdmin()) {
            throw new ForbiddenException("Apenas administradores podem gerenciar escolas");
        }
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}

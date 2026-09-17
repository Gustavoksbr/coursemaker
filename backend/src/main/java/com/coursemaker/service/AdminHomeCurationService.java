package com.coursemaker.service;

import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.admin.AdminDtos.HomePicksResponse;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Backs the admin's "Personalizar home" screen: exactly which courses, posts, trilhas and schools
 * show up on the landing page, and in what order. Each kind is still owned by its own service
 * (Course/Post/Trilha/SchoolService) - this just fans a single admin action out to the right one.
 */
@Service
@RequiredArgsConstructor
public class AdminHomeCurationService {

    private final CourseService courseService;
    private final PostService postService;
    private final TrilhaService trilhaService;
    private final SchoolService schoolService;

    @Transactional(readOnly = true)
    public HomePicksResponse getHomePicks(User admin) {
        requireAdmin(admin);
        return new HomePicksResponse(
                courseService.listHomePicks(admin),
                postService.listHomePicks(admin),
                trilhaService.listHomePicks(admin),
                schoolService.listHomePicks());
    }

    @Transactional
    public Object setHomePicks(String kind, List<UUID> ids, User admin) {
        requireAdmin(admin);
        List<UUID> safeIds = ids == null ? List.of() : ids;
        return switch (kind) {
            case "courses" -> courseService.setHomePicks(safeIds, admin);
            case "posts" -> postService.setHomePicks(safeIds, admin);
            case "trilhas" -> trilhaService.setHomePicks(safeIds, admin);
            case "schools" -> schoolService.setHomePicks(safeIds, admin);
            default -> throw new BadRequestException("Tipo de conteudo invalido: " + kind);
        };
    }

    private void requireAdmin(User user) {
        if (!user.isAdmin()) {
            throw new ForbiddenException("Apenas administradores podem curar a home");
        }
    }
}

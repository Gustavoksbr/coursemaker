package com.coursemaker.dto.user;

import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.post.PostDtos.PostSummary;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaSummary;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * What {@code GET /api/v1/users/{nickname}} returns. No email, no password hash.
 *
 * <p>{@code deleted} is true for an account that asked to be removed: {@code name}, {@code image}
 * and {@code bio} are already the scrubbed placeholders by the time this DTO is built (see
 * {@code UserService.deleteAccount}), so the frontend only needs the flag to swap in "Conta
 * excluida" copy - the courses/posts/trilhas lists still come through as-is.
 */
public record PublicProfileResponse(
        UUID id,
        String nickname,
        String name,
        String image,
        String bio,
        List<String> stacks,
        Instant createdAt,
        boolean deleted,
        List<CourseSummary> courses,
        List<PostSummary> posts,
        List<TrilhaSummary> trilhas) {
}

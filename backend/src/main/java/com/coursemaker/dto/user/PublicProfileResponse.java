package com.coursemaker.dto.user;

import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.post.PostDtos.PostSummary;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaSummary;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** What {@code GET /api/v1/users/{nickname}} returns. No email, no password hash. */
public record PublicProfileResponse(
        UUID id,
        String nickname,
        String name,
        String image,
        String bio,
        List<String> stacks,
        Instant createdAt,
        List<CourseSummary> courses,
        List<PostSummary> posts,
        List<TrilhaSummary> trilhas) {
}

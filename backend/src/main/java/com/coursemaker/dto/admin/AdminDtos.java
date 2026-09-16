package com.coursemaker.dto.admin;

import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.post.PostDtos.PostSummary;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaSummary;
import com.coursemaker.dto.user.UserSummary;

import java.time.Instant;
import java.util.UUID;

public final class AdminDtos {

    private AdminDtos() {
    }

    /**
     * One row of the admin moderation list: a course, post or trilha currently blocked, with just
     * enough to link back to it and show who owns it. {@code blockedAt} is the entity's last update
     * timestamp - there is no dedicated "blocked at" column, and the toggle is the only thing an
     * admin does to someone else's content, so it is a reasonable stand-in.
     */
    public record BlockedContentItem(
            UUID id,
            String kind,
            String title,
            String slug,
            UserSummary owner,
            Instant blockedAt) {

        public static BlockedContentItem of(CourseSummary course) {
            return new BlockedContentItem(
                    course.id(), "course", course.name(), course.slug(), course.owner(), course.updatedAt());
        }

        public static BlockedContentItem of(PostSummary post) {
            return new BlockedContentItem(
                    post.id(), "post", post.title(), post.slug(), post.owner(), post.updatedAt());
        }

        public static BlockedContentItem of(TrilhaSummary trilha) {
            return new BlockedContentItem(
                    trilha.id(), "trilha", trilha.title(), trilha.slug(), trilha.owner(), trilha.updatedAt());
        }
    }
}

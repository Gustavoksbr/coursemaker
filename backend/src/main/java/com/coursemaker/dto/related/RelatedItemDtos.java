package com.coursemaker.dto.related;

import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.post.PostDtos.PostSummary;

import java.time.Instant;
import java.util.UUID;

public final class RelatedItemDtos {

    private RelatedItemDtos() {
    }

    /** Exactly one of {@code course}/{@code post} is set. */
    public record RelatedItemResponse(UUID id, CourseSummary course, PostSummary post, int orderIndex,
                                      Instant createdAt) {
    }

    /** Exactly one of {@code relatedCourseId}/{@code relatedPostId} must be set. */
    public record AddRelatedItemRequest(UUID relatedCourseId, UUID relatedPostId, Integer orderIndex) {
    }
}

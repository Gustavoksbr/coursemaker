package com.coursemaker.dto.search;

import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.post.PostDtos.PostSummary;

import java.util.List;

public final class SearchDtos {

    private SearchDtos() {
    }

    /**
     * Result of the unified homepage search. Trails are not implemented yet, but the field is here
     * so the frontend can render the section as soon as they are.
     */
    public record SearchResponse(
            String query,
            SearchSection<CourseSummary> courses,
            SearchSection<PostSummary> posts) {
    }

    public record SearchSection<T>(List<T> items, long total) {
    }
}

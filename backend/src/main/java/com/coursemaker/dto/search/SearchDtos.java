package com.coursemaker.dto.search;

import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.post.PostDtos.PostSummary;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaSummary;
import com.coursemaker.dto.user.PersonSummary;

import java.util.List;

public final class SearchDtos {

    private SearchDtos() {
    }

    /** Result of the unified search: a compact preview across every content type plus people. */
    public record SearchResponse(
            String query,
            SearchSection<CourseSummary> courses,
            SearchSection<PostSummary> posts,
            SearchSection<TrilhaSummary> trilhas,
            SearchSection<PersonSummary> people) {
    }

    public record SearchSection<T>(List<T> items, long total) {
    }
}

package com.coursemaker.service;

import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.post.PostDtos.PostSummary;
import com.coursemaker.dto.search.SearchDtos.SearchResponse;
import com.coursemaker.dto.search.SearchDtos.SearchSection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The unified homepage search: one query term, courses and posts filtered together.
 *
 * <p>With an empty term it degrades into the homepage's default view - featured courses first,
 * falling back to the most recent ones, plus the latest posts.
 */
@Service
@RequiredArgsConstructor
public class SearchService {

    private final CourseService courseService;
    private final PostService postService;

    @Transactional
    public SearchResponse search(String query, int limit, User viewer) {
        String term = (query == null || query.isBlank()) ? null : query.trim();

        if (term == null) {
            PageResponse<CourseSummary> featured =
                    courseService.search(null, null, null, null, true, "recent", 0, limit, viewer);
            PageResponse<CourseSummary> courses = featured.items().isEmpty()
                    ? courseService.search(null, null, null, null, null, "recent", 0, limit, viewer)
                    : featured;
            PageResponse<PostSummary> posts =
                    postService.search(null, null, null, null, null, "recent", 0, limit, viewer);

            return new SearchResponse(
                    "",
                    new SearchSection<>(courses.items(), courses.totalItems()),
                    new SearchSection<>(posts.items(), posts.totalItems()));
        }

        PageResponse<CourseSummary> courses =
                courseService.search(term, null, null, null, null, "recent", 0, limit, viewer);
        PageResponse<PostSummary> posts =
                postService.search(term, null, null, null, null, "recent", 0, limit, viewer);

        return new SearchResponse(
                term,
                new SearchSection<>(courses.items(), courses.totalItems()),
                new SearchSection<>(posts.items(), posts.totalItems()));
    }
}

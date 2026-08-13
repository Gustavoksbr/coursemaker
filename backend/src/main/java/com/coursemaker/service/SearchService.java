package com.coursemaker.service;

import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.post.PostDtos.PostSummary;
import com.coursemaker.dto.search.SearchDtos.SearchResponse;
import com.coursemaker.dto.search.SearchDtos.SearchSection;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaSummary;
import com.coursemaker.dto.user.PersonSummary;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The unified search: one query term, courses/posts/trilhas/people previewed together.
 *
 * <p>With an empty term it degrades into a "destaques" view - featured content first, falling back
 * to the most recent, plus the newest people to join. This backs both the homepage's default view
 * and the search page's "Principais" tab.
 */
@Service
@RequiredArgsConstructor
public class SearchService {

    private final CourseService courseService;
    private final PostService postService;
    private final TrilhaService trilhaService;
    private final UserService userService;

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

            PageResponse<TrilhaSummary> featuredTrilhas =
                    trilhaService.search(null, null, null, null, true, "recent", 0, limit, viewer);
            PageResponse<TrilhaSummary> trilhas = featuredTrilhas.items().isEmpty()
                    ? trilhaService.search(null, null, null, null, null, "recent", 0, limit, viewer)
                    : featuredTrilhas;

            PageResponse<PersonSummary> people = userService.search(null, "recent", 0, limit);

            return new SearchResponse(
                    "",
                    new SearchSection<>(courses.items(), courses.totalItems()),
                    new SearchSection<>(posts.items(), posts.totalItems()),
                    new SearchSection<>(trilhas.items(), trilhas.totalItems()),
                    new SearchSection<>(people.items(), people.totalItems()));
        }

        PageResponse<CourseSummary> courses =
                courseService.search(term, null, null, null, null, "recent", 0, limit, viewer);
        PageResponse<PostSummary> posts =
                postService.search(term, null, null, null, null, "recent", 0, limit, viewer);
        PageResponse<TrilhaSummary> trilhas =
                trilhaService.search(term, null, null, null, null, "recent", 0, limit, viewer);
        PageResponse<PersonSummary> people = userService.search(term, "recent", 0, limit);

        return new SearchResponse(
                term,
                new SearchSection<>(courses.items(), courses.totalItems()),
                new SearchSection<>(posts.items(), posts.totalItems()),
                new SearchSection<>(trilhas.items(), trilhas.totalItems()),
                new SearchSection<>(people.items(), people.totalItems()));
    }
}

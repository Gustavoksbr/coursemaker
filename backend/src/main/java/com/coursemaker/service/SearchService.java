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

import java.util.List;
import java.util.UUID;

/**
 * The unified search: one query term, courses/posts/trilhas/people previewed together.
 *
 * <p>With an empty term it degrades into a "destaques" view - the admin's home curation
 * ({@code sort=curated}), falling back to the most recent when nothing has been chosen yet, plus
 * the newest people to join. This backs both the homepage's default view and the search page's
 * "Principais" tab.
 */
@Service
@RequiredArgsConstructor
public class SearchService {

    private final CourseService courseService;
    private final PostService postService;
    private final TrilhaService trilhaService;
    private final UserService userService;

    @Transactional
    public SearchResponse search(String query, int limit, User viewer, List<UUID> areaIds) {
        String term = (query == null || query.isBlank()) ? null : query.trim();

        if (term == null) {
            PageResponse<CourseSummary> curatedCourses =
                    courseService.search(null, null, null, null, true, areaIds, null, "curated", 0, limit, viewer);
            PageResponse<CourseSummary> courses = curatedCourses.items().isEmpty()
                    ? courseService.search(null, null, null, null, null, areaIds, null, "recent", 0, limit, viewer)
                    : curatedCourses;

            PageResponse<PostSummary> curatedPosts =
                    postService.search(null, null, null, null, true, areaIds, null, "curated", 0, limit, viewer);
            PageResponse<PostSummary> posts = curatedPosts.items().isEmpty()
                    ? postService.search(null, null, null, null, null, areaIds, null, "recent", 0, limit, viewer)
                    : curatedPosts;

            PageResponse<TrilhaSummary> curatedTrilhas =
                    trilhaService.search(null, null, null, null, true, areaIds, null, "curated", 0, limit, viewer);
            PageResponse<TrilhaSummary> trilhas = curatedTrilhas.items().isEmpty()
                    ? trilhaService.search(null, null, null, null, null, areaIds, null, "recent", 0, limit, viewer)
                    : curatedTrilhas;

            PageResponse<PersonSummary> people = userService.search(null, "recent", 0, limit);

            return new SearchResponse(
                    "",
                    new SearchSection<>(courses.items(), courses.totalItems()),
                    new SearchSection<>(posts.items(), posts.totalItems()),
                    new SearchSection<>(trilhas.items(), trilhas.totalItems()),
                    new SearchSection<>(people.items(), people.totalItems()));
        }

        PageResponse<CourseSummary> courses =
                courseService.search(term, null, null, null, null, areaIds, null, "recent", 0, limit, viewer);
        PageResponse<PostSummary> posts =
                postService.search(term, null, null, null, null, areaIds, null, "recent", 0, limit, viewer);
        PageResponse<TrilhaSummary> trilhas =
                trilhaService.search(term, null, null, null, null, areaIds, null, "recent", 0, limit, viewer);
        PageResponse<PersonSummary> people = userService.search(term, "recent", 0, limit);

        return new SearchResponse(
                term,
                new SearchSection<>(courses.items(), courses.totalItems()),
                new SearchSection<>(posts.items(), posts.totalItems()),
                new SearchSection<>(trilhas.items(), trilhas.totalItems()),
                new SearchSection<>(people.items(), people.totalItems()));
    }
}

package com.coursemaker.service;

import com.coursemaker.domain.entity.Post;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.area.AreaDtos.AreaSummary;
import com.coursemaker.dto.post.PostDtos.PostSummary;
import com.coursemaker.dto.user.UserSummary;
import com.coursemaker.repository.LibraryItemRepository;
import com.coursemaker.repository.PostLikeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Post counterpart of {@link CourseMapper}: one query per aggregate, not one per row. */
@Component
@RequiredArgsConstructor
public class PostMapper {

    private final PostLikeRepository postLikeRepository;
    private final LibraryItemRepository libraryItemRepository;

    @Transactional(readOnly = true)
    public List<PostSummary> toSummaries(List<Post> posts, User viewer) {
        if (posts.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = posts.stream().map(Post::getId).toList();

        Map<UUID, Long> likeCounts = new HashMap<>();
        for (Object[] row : postLikeRepository.countByPostIds(ids)) {
            likeCounts.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        Set<UUID> liked = viewer == null ? Set.of()
                : new HashSet<>(postLikeRepository.findLikedPostIds(viewer.getId(), ids));
        Set<UUID> saved = viewer == null ? Set.of()
                : new HashSet<>(libraryItemRepository.findSavedPostIds(viewer.getId(), ids));

        return posts.stream()
                .map(post -> new PostSummary(
                        post.getId(),
                        post.getTitle(),
                        post.getSlug(),
                        post.getDescription(),
                        post.getThumbnailUrl(),
                        post.getVisibility(),
                        post.getStatus(),
                        post.getCategories(),
                        post.isFeatured(),
                        AreaSummary.from(post.getArea()),
                        UserSummary.from(post.getOwner()),
                        likeCounts.getOrDefault(post.getId(), 0L),
                        liked.contains(post.getId()),
                        saved.contains(post.getId()),
                        post.getCreatedAt(),
                        post.getUpdatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public PostSummary toSummary(Post post, User viewer) {
        return toSummaries(List.of(post), viewer).get(0);
    }
}

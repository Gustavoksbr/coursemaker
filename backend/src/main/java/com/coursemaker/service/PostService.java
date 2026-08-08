package com.coursemaker.service;

import com.coursemaker.domain.entity.Post;
import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.CourseStatus;
import com.coursemaker.domain.enums.CourseVisibility;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.course.CourseDtos.SlugAvailability;
import com.coursemaker.dto.curriculum.CurriculumDtos.BlockResponse;
import com.coursemaker.dto.post.PostDtos.CreatePostRequest;
import com.coursemaker.dto.post.PostDtos.PostDetail;
import com.coursemaker.dto.post.PostDtos.PostSummary;
import com.coursemaker.dto.post.PostDtos.UpdatePostRequest;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.PostBlockRepository;
import com.coursemaker.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PostService {

    private static final int MAX_PAGE_SIZE = 50;

    private final PostRepository postRepository;
    private final PostBlockRepository postBlockRepository;
    private final PostMapper postMapper;
    private final SlugGeneratorService slugGenerator;

    // ------------------------------------------------------------------ reads

    @Transactional(readOnly = true)
    public PageResponse<PostSummary> search(String q, String author, CourseVisibility visibility,
                                            List<String> categories, Boolean featuredOnly, String sort,
                                            int page, int size, User viewer) {
        Page<Post> result = postRepository.search(
                blankToNull(q),
                blankToNull(author),
                visibility == null ? null : visibility.getValue(),
                CourseService.joinCategories(categories),
                featuredOnly,
                sort == null ? "recent" : sort,
                viewer == null ? null : viewer.getId(),
                PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));

        return PageResponse.of(result, postMapper.toSummaries(result.getContent(), viewer));
    }

    @Transactional(readOnly = true)
    public PostDetail getById(UUID id, User viewer) {
        return toDetail(loadVisible(id, viewer), viewer);
    }

    @Transactional(readOnly = true)
    public PostDetail getByNicknameAndSlug(String nickname, String slug, User viewer) {
        Post post = postRepository.findByOwnerNicknameAndSlug(nickname, slug)
                .orElseThrow(() -> ResourceNotFoundException.of("Post"));
        requireVisible(post, viewer);
        return toDetail(post, viewer);
    }

    @Transactional(readOnly = true)
    public List<PostSummary> listByOwner(UUID ownerId, User viewer) {
        List<Post> posts = postRepository.findAllByOwnerId(ownerId).stream()
                .filter(post -> canView(post, viewer))
                .toList();
        return postMapper.toSummaries(posts, viewer);
    }

    @Transactional(readOnly = true)
    public SlugAvailability checkSlug(String desired, User owner) {
        String slug = slugGenerator.slugify(desired);
        boolean available = !postRepository.existsByOwnerIdAndSlug(owner.getId(), slug);
        String suggestion = available ? slug
                : slugGenerator.uniqueSlug(slug, postRepository.findSlugsStartingWith(owner.getId(), slug));
        return new SlugAvailability(slug, available, suggestion);
    }

    // ----------------------------------------------------------------- writes

    @Transactional
    public PostSummary create(CreatePostRequest request, User owner) {
        if (owner.getNickname() == null || owner.getNickname().isBlank()) {
            throw new BadRequestException("Defina seu nickname antes de criar conteudo");
        }

        String desired = (request.slug() == null || request.slug().isBlank()) ? request.title() : request.slug();
        String slug = slugGenerator.uniqueSlug(desired,
                postRepository.findSlugsStartingWith(owner.getId(), slugGenerator.slugify(desired)));

        Post post = Post.builder()
                .owner(owner)
                .title(request.title().trim())
                .slug(slug)
                .description(request.description())
                .thumbnailUrl(request.thumbnailUrl())
                .visibility(request.visibility() == null ? CourseVisibility.PUBLIC : request.visibility())
                .status(CourseStatus.UNAVAILABLE)
                .categories(CourseService.normalizeCategories(request.categories()))
                .build();

        return postMapper.toSummary(postRepository.save(post), owner);
    }

    @Transactional
    public PostSummary update(UUID id, UpdatePostRequest request, User viewer) {
        Post post = loadForEditing(id, viewer);

        if (request.title() != null) {
            post.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            post.setDescription(request.description());
        }
        if (request.thumbnailUrl() != null) {
            post.setThumbnailUrl(request.thumbnailUrl());
        }
        if (request.visibility() != null) {
            post.setVisibility(request.visibility());
        }
        if (request.status() != null) {
            post.setStatus(request.status());
        }
        if (request.categories() != null) {
            post.setCategories(CourseService.normalizeCategories(request.categories()));
        }
        return postMapper.toSummary(postRepository.save(post), viewer);
    }

    @Transactional
    public void delete(UUID id, User viewer) {
        postRepository.delete(loadForEditing(id, viewer));
    }

    @Transactional
    public PostSummary toggleFeatured(UUID id, User admin) {
        if (!admin.isAdmin()) {
            throw new ForbiddenException("Apenas administradores podem destacar posts");
        }
        Post post = postRepository.findByIdWithOwner(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Post"));
        post.setFeatured(!post.isFeatured());
        return postMapper.toSummary(postRepository.save(post), admin);
    }

    // ---------------------------------------------------------------- helpers

    @Transactional(readOnly = true)
    public Post loadVisible(UUID id, User viewer) {
        Post post = postRepository.findByIdWithOwner(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Post"));
        requireVisible(post, viewer);
        return post;
    }

    @Transactional(readOnly = true)
    public Post loadForEditing(UUID id, User viewer) {
        Post post = postRepository.findByIdWithOwner(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Post"));
        if (!isOwner(post, viewer)) {
            requireVisible(post, viewer);
            throw new ForbiddenException("Apenas o dono do post pode fazer isso");
        }
        return post;
    }

    public boolean isOwner(Post post, User viewer) {
        return viewer != null && post.getOwner().getId().equals(viewer.getId());
    }

    private boolean canView(Post post, User viewer) {
        return post.isPublished() || isOwner(post, viewer) || (viewer != null && viewer.isAdmin());
    }

    private void requireVisible(Post post, User viewer) {
        if (!canView(post, viewer)) {
            throw ResourceNotFoundException.of("Post");
        }
    }

    private PostDetail toDetail(Post post, User viewer) {
        List<BlockResponse> blocks = postBlockRepository.findByPostOrdered(post.getId()).stream()
                .map(BlockResponse::of)
                .toList();
        return new PostDetail(postMapper.toSummary(post, viewer), blocks, isOwner(post, viewer));
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}

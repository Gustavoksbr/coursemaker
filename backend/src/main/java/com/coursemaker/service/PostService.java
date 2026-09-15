package com.coursemaker.service;

import com.coursemaker.domain.entity.Area;
import com.coursemaker.domain.entity.Post;
import com.coursemaker.domain.entity.School;
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
import com.coursemaker.repository.AreaRepository;
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
    private final AreaRepository areaRepository;
    private final SchoolService schoolService;
    private final PostBlockRepository postBlockRepository;
    private final PostAccessService accessService;
    private final PrivatePostAccessService privateAccessService;
    private final PostMapper postMapper;
    private final SlugGeneratorService slugGenerator;
    private final PasswordHasher passwordHasher;
    private final NotificationService notificationService;

    // ------------------------------------------------------------------ reads

    @Transactional(readOnly = true)
    public PageResponse<PostSummary> search(String q, String author, CourseVisibility visibility,
                                            List<String> categories, Boolean featuredOnly, List<UUID> areaIds,
                                            UUID schoolId, String sort, int page, int size, User viewer) {
        Page<Post> result = postRepository.search(
                blankToNull(q),
                blankToNull(author),
                visibility == null ? null : visibility.getValue(),
                CourseService.joinCategories(categories),
                featuredOnly,
                CourseService.joinIds(areaIds),
                schoolId,
                sort == null ? "recent" : sort,
                viewer == null ? null : viewer.getId(),
                PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));

        return PageResponse.of(result, postMapper.toSummaries(result.getContent(), viewer));
    }

    // Not read-only: opening a private post silently restores access for a reader who has already
    // proven they know the password (see PrivatePostAccessService).
    @Transactional
    public PostDetail getById(UUID id, User viewer) {
        Post post = loadVisible(id, viewer);
        privateAccessService.restoreIfPreviouslyVerified(post, viewer);
        return toDetail(post, viewer);
    }

    @Transactional
    public PostDetail getByNicknameAndSlug(String nickname, String slug, User viewer) {
        Post post = postRepository.findByOwnerNicknameAndSlug(nickname, slug)
                .orElseThrow(() -> ResourceNotFoundException.of("Post"));
        accessService.requireVisible(post, viewer);
        privateAccessService.restoreIfPreviouslyVerified(post, viewer);
        return toDetail(post, viewer);
    }

    @Transactional(readOnly = true)
    public List<PostSummary> listByOwner(UUID ownerId, User viewer) {
        List<Post> posts = postRepository.findAllByOwnerId(ownerId).stream()
                .filter(post -> accessService.canView(post, viewer))
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

        CourseVisibility visibility = request.visibility() == null ? CourseVisibility.PUBLIC : request.visibility();
        String passwordHash = null;
        if (visibility == CourseVisibility.PRIVATE) {
            passwordHash = passwordHasher.hashRequired(request.password(),
                    "Posts privados exigem uma senha de acesso");
        }

        Area area = areaRepository.findById(request.areaId())
                .orElseThrow(() -> ResourceNotFoundException.of("Area"));
        School school = schoolService.requireAllowedSchool(request.schoolId(), owner);

        Post post = Post.builder()
                .owner(owner)
                .area(area)
                .school(school)
                .title(request.title().trim())
                .slug(slug)
                .description(request.description())
                .thumbnailUrl(request.thumbnailUrl())
                .visibility(visibility)
                .status(CourseStatus.UNAVAILABLE)
                .passwordHash(passwordHash)
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
        if (request.status() != null) {
            post.setStatus(request.status());
        }
        if (request.categories() != null) {
            post.setCategories(CourseService.normalizeCategories(request.categories()));
        }
        if (request.areaId() != null) {
            post.setArea(areaRepository.findById(request.areaId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Area")));
        }
        if (request.removeSchool()) {
            post.setSchool(null);
        } else if (request.schoolId() != null) {
            post.setSchool(schoolService.requireAllowedSchool(request.schoolId(), viewer));
        }
        applyVisibility(post, request);

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

    @Transactional
    public PostSummary toggleBlock(UUID id, User admin) {
        if (!admin.isAdmin()) {
            throw new ForbiddenException("Apenas administradores podem bloquear posts");
        }
        Post post = postRepository.findByIdWithOwner(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Post"));
        
        boolean wasBlocked = post.isBlockedByAdmin();
        post.setBlockedByAdmin(!wasBlocked);
        Post saved = postRepository.save(post);
        
        // Notify owner
        if (!wasBlocked) {
            notificationService.notifyPostBlocked(saved, admin);
        } else {
            notificationService.notifyPostUnblocked(saved, admin);
        }
        
        return postMapper.toSummary(saved, admin);
    }

    // ---------------------------------------------------------------- helpers

    @Transactional(readOnly = true)
    public Post loadVisible(UUID id, User viewer) {
        Post post = postRepository.findByIdWithOwner(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Post"));
        accessService.requireVisible(post, viewer);
        return post;
    }

    /**
     * Loads a post for editing. Kept separate from {@link #loadVisible} so callers cannot forget
     * the ownership check.
     */
    @Transactional(readOnly = true)
    public Post loadForEditing(UUID id, User viewer) {
        Post post = postRepository.findByIdWithOwner(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Post"));
        accessService.requireOwner(post, viewer);
        return post;
    }

    public boolean isOwner(Post post, User viewer) {
        return accessService.isOwner(post, viewer);
    }

    private PostDetail toDetail(Post post, User viewer) {
        boolean owner = accessService.isOwner(post, viewer);
        boolean canViewContent = accessService.canViewContent(post, viewer);

        List<BlockResponse> blocks = canViewContent
                ? postBlockRepository.findByPostOrdered(post.getId()).stream().map(BlockResponse::of).toList()
                : List.of();

        return new PostDetail(
                postMapper.toSummary(post, viewer),
                blocks,
                owner,
                post.isPrivate() && !canViewContent,
                post.getPasswordHash() != null);
    }

    /** Mirrors {@code CourseService.applyVisibility}. */
    private void applyVisibility(Post post, UpdatePostRequest request) {
        boolean becomingPrivate = request.visibility() == CourseVisibility.PRIVATE;
        boolean becomingPublic = request.visibility() == CourseVisibility.PUBLIC;

        if (becomingPublic) {
            post.setVisibility(CourseVisibility.PUBLIC);
            post.setPasswordHash(null);
            return;
        }

        if (becomingPrivate) {
            post.setVisibility(CourseVisibility.PRIVATE);
            if (request.password() != null && !request.password().isBlank()) {
                post.setPasswordHash(passwordHasher.hash(request.password()));
            } else if (post.getPasswordHash() == null) {
                throw new BadRequestException("Posts privados exigem uma senha de acesso");
            }
            return;
        }

        // Visibility untouched: still allow rotating the password of an already-private post.
        if (request.password() != null && !request.password().isBlank() && post.isPrivate()) {
            post.setPasswordHash(passwordHasher.hash(request.password()));
        }
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}

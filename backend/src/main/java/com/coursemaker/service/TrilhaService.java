package com.coursemaker.service;

import com.coursemaker.domain.entity.CompositeIds.CourseTrilhaId;
import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.CourseTrilhaHighlight;
import com.coursemaker.domain.entity.Post;
import com.coursemaker.domain.entity.Trilha;
import com.coursemaker.domain.entity.TrilhaItem;
import com.coursemaker.domain.entity.TrilhaStep;
import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.CourseStatus;
import com.coursemaker.domain.enums.CourseVisibility;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.course.CourseDtos.SlugAvailability;
import com.coursemaker.dto.trilha.TrilhaDtos.AddTrilhaItemRequest;
import com.coursemaker.dto.trilha.TrilhaDtos.CreateTrilhaRequest;
import com.coursemaker.dto.trilha.TrilhaDtos.CreateTrilhaStepRequest;
import com.coursemaker.dto.trilha.TrilhaDtos.MoveTrilhaItemRequest;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaDetail;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaItemResponse;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaProgressResponse;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaStepResponse;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaStructure;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaSummary;
import com.coursemaker.dto.trilha.TrilhaDtos.UpdateTrilhaItemRequest;
import com.coursemaker.dto.trilha.TrilhaDtos.UpdateTrilhaRequest;
import com.coursemaker.dto.trilha.TrilhaDtos.UpdateTrilhaStepRequest;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.CourseRepository;
import com.coursemaker.repository.CourseTrilhaHighlightRepository;
import com.coursemaker.repository.PostRepository;
import com.coursemaker.repository.TrilhaEnrollmentRepository;
import com.coursemaker.repository.TrilhaItemCompletionRepository;
import com.coursemaker.repository.TrilhaItemRepository;
import com.coursemaker.repository.TrilhaRepository;
import com.coursemaker.repository.TrilhaStepRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrilhaService {

    private static final int MAX_PAGE_SIZE = 50;
    private static final int MAX_HIGHLIGHTS = 5;

    private final TrilhaRepository trilhaRepository;
    private final TrilhaItemRepository trilhaItemRepository;
    private final TrilhaStepRepository trilhaStepRepository;
    private final CourseTrilhaHighlightRepository highlightRepository;
    private final TrilhaEnrollmentRepository trilhaEnrollmentRepository;
    private final TrilhaItemCompletionRepository trilhaItemCompletionRepository;
    private final CourseRepository courseRepository;
    private final PostRepository postRepository;
    private final TrilhaMapper trilhaMapper;
    private final SlugGeneratorService slugGenerator;

    // ------------------------------------------------------------------ reads

    @Transactional(readOnly = true)
    public PageResponse<TrilhaSummary> search(String q, String author, CourseVisibility visibility,
                                              List<String> categories, Boolean featuredOnly, String sort,
                                              int page, int size, User viewer) {
        Page<Trilha> result = trilhaRepository.search(
                blankToNull(q),
                blankToNull(author),
                visibility == null ? null : visibility.getValue(),
                CourseService.joinCategories(categories),
                featuredOnly,
                sort == null ? "recent" : sort,
                viewer == null ? null : viewer.getId(),
                PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));

        return PageResponse.of(result, trilhaMapper.toSummaries(result.getContent(), viewer));
    }

    @Transactional(readOnly = true)
    public TrilhaDetail getById(UUID id, User viewer) {
        return toDetail(loadVisible(id, viewer), viewer);
    }

    @Transactional(readOnly = true)
    public TrilhaDetail getByNicknameAndSlug(String nickname, String slug, User viewer) {
        Trilha trilha = trilhaRepository.findByOwnerNicknameAndSlug(nickname, slug)
                .orElseThrow(() -> ResourceNotFoundException.of("Trilha"));
        requireVisible(trilha, viewer);
        return toDetail(trilha, viewer);
    }

    /** Trilhas the user follows (is enrolled in), for the library page. */
    @Transactional(readOnly = true)
    public List<TrilhaSummary> myFollowedTrilhas(User user) {
        List<UUID> trilhaIds = trilhaEnrollmentRepository.findAllTrilhaIdsByUser(user.getId());
        if (trilhaIds.isEmpty()) {
            return List.of();
        }
        List<Trilha> trilhas = trilhaIds.stream()
                .map(trilhaRepository::findByIdWithOwner)
                .flatMap(java.util.Optional::stream)
                .filter(trilha -> canView(trilha, user))
                .toList();
        return trilhaMapper.toSummaries(trilhas, user);
    }

    /** Followed trilhas the user has finished every item of, for the library's "concluidos". */
    @Transactional(readOnly = true)
    public List<TrilhaSummary> myCompletedTrilhas(User user) {
        List<UUID> trilhaIds = trilhaEnrollmentRepository.findAllTrilhaIdsByUser(user.getId());
        if (trilhaIds.isEmpty()) {
            return List.of();
        }
        List<Trilha> trilhas = trilhaIds.stream()
                .map(trilhaRepository::findByIdWithOwner)
                .flatMap(java.util.Optional::stream)
                .filter(trilha -> canView(trilha, user))
                .filter(trilha -> isFinished(trilha, user))
                .toList();
        return trilhaMapper.toSummaries(trilhas, user);
    }

    private boolean isFinished(Trilha trilha, User user) {
        long total = trilhaItemRepository.countByTrilhaId(trilha.getId());
        if (total == 0) {
            return false;
        }
        long completed = trilhaItemCompletionRepository.findCompletedItemIds(user.getId(), trilha.getId()).size();
        return completed >= total;
    }

    @Transactional(readOnly = true)
    public List<TrilhaSummary> listByOwner(UUID ownerId, User viewer) {
        List<Trilha> trilhas = trilhaRepository.findAllByOwnerId(ownerId).stream()
                .filter(trilha -> canView(trilha, viewer))
                .toList();
        return trilhaMapper.toSummaries(trilhas, viewer);
    }

    @Transactional(readOnly = true)
    public SlugAvailability checkSlug(String desired, User owner) {
        String slug = slugGenerator.slugify(desired);
        boolean available = !trilhaRepository.existsByOwnerIdAndSlug(owner.getId(), slug);
        String suggestion = available ? slug
                : slugGenerator.uniqueSlug(slug, trilhaRepository.findSlugsStartingWith(owner.getId(), slug));
        return new SlugAvailability(slug, available, suggestion);
    }

    // ----------------------------------------------------------------- writes

    @Transactional
    public TrilhaSummary create(CreateTrilhaRequest request, User owner) {
        requireNickname(owner);

        String desired = (request.slug() == null || request.slug().isBlank()) ? request.title() : request.slug();
        String slug = slugGenerator.uniqueSlug(desired,
                trilhaRepository.findSlugsStartingWith(owner.getId(), slugGenerator.slugify(desired)));

        Trilha trilha = Trilha.builder()
                .owner(owner)
                .title(request.title().trim())
                .slug(slug)
                .description(request.description())
                .thumbnailUrl(request.thumbnailUrl())
                // Trilhas have no password gate (unlike courses), so private is not offered: every
                // trilha is public regardless of what the request asks for.
                .visibility(CourseVisibility.PUBLIC)
                .status(CourseStatus.UNAVAILABLE)
                .categories(CourseService.normalizeCategories(request.categories()))
                .build();

        return trilhaMapper.toSummary(trilhaRepository.save(trilha), owner);
    }

    @Transactional
    public TrilhaSummary update(UUID id, UpdateTrilhaRequest request, User viewer) {
        Trilha trilha = loadForEditing(id, viewer);

        if (request.title() != null) {
            trilha.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            trilha.setDescription(request.description());
        }
        if (request.thumbnailUrl() != null) {
            trilha.setThumbnailUrl(request.thumbnailUrl());
        }
        // Visibility is intentionally not settable here: trilhas have no password gate, so private
        // is not a real state for them (see create() above).
        if (request.status() != null) {
            trilha.setStatus(request.status());
        }
        if (request.categories() != null) {
            trilha.setCategories(CourseService.normalizeCategories(request.categories()));
        }
        return trilhaMapper.toSummary(trilhaRepository.save(trilha), viewer);
    }

    @Transactional
    public void delete(UUID id, User viewer) {
        // trilha_items, highlights, enrollments and item completions all go with it via
        // ON DELETE CASCADE in the schema.
        trilhaRepository.delete(loadForEditing(id, viewer));
    }

    @Transactional
    public TrilhaSummary toggleFeatured(UUID id, User admin) {
        if (!admin.isAdmin()) {
            throw new ForbiddenException("Apenas administradores podem destacar trilhas");
        }
        Trilha trilha = trilhaRepository.findByIdWithOwner(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Trilha"));
        trilha.setFeatured(!trilha.isFeatured());
        return trilhaMapper.toSummary(trilhaRepository.save(trilha), admin);
    }

    // ------------------------------------------------------------------ items

    @Transactional
    public TrilhaItemResponse addItem(UUID trilhaId, AddTrilhaItemRequest request, User owner) {
        Trilha trilha = loadForEditing(trilhaId, owner);

        boolean hasCourse = request.courseId() != null;
        boolean hasPost = request.postId() != null;
        if (hasCourse == hasPost) {
            throw new BadRequestException("Informe exatamente um curso ou post para adicionar a trilha");
        }

        TrilhaStep step = request.stepId() == null ? null : requireStepInTrilha(trilha, request.stepId());

        TrilhaItem.TrilhaItemBuilder builder = TrilhaItem.builder().trilha(trilha).step(step);
        if (hasCourse) {
            if (trilhaItemRepository.existsByTrilhaIdAndCourseId(trilha.getId(), request.courseId())) {
                throw new BadRequestException("Este curso ja esta nesta trilha");
            }
            Course course = courseRepository.findByIdWithOwner(request.courseId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Curso"));
            builder.course(course);
        } else {
            if (trilhaItemRepository.existsByTrilhaIdAndPostId(trilha.getId(), request.postId())) {
                throw new BadRequestException("Este post ja esta nesta trilha");
            }
            Post post = postRepository.findByIdWithOwner(request.postId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Post"));
            builder.post(post);
        }

        int orderIndex = request.orderIndex() != null ? request.orderIndex() : nextOrderIndex(trilha.getId(), step);
        TrilhaItem saved = trilhaItemRepository.save(builder.orderIndex(orderIndex).build());
        return trilhaMapper.toItemResponses(List.of(saved), owner).get(0);
    }

    @Transactional
    public TrilhaItemResponse updateItem(UUID trilhaId, UUID itemId, UpdateTrilhaItemRequest request, User owner) {
        Trilha trilha = loadForEditing(trilhaId, owner);
        TrilhaItem item = requireItemInTrilha(trilha, itemId);

        if (request.orderIndex() != null) {
            item.setOrderIndex(request.orderIndex());
        }
        if (request.note() != null) {
            item.setNote(request.note().isBlank() ? null : request.note());
        }
        TrilhaItem saved = trilhaItemRepository.save(item);
        return trilhaMapper.toItemResponses(List.of(saved), owner).get(0);
    }

    /** Moves an item into a step, or ungroups it if {@code stepId} is null -- always applied. */
    @Transactional
    public TrilhaItemResponse moveItem(UUID trilhaId, UUID itemId, MoveTrilhaItemRequest request, User owner) {
        Trilha trilha = loadForEditing(trilhaId, owner);
        TrilhaItem item = requireItemInTrilha(trilha, itemId);

        TrilhaStep step = request.stepId() == null ? null : requireStepInTrilha(trilha, request.stepId());
        item.setStep(step);
        item.setOrderIndex(nextOrderIndex(trilha.getId(), step));

        TrilhaItem saved = trilhaItemRepository.save(item);
        return trilhaMapper.toItemResponses(List.of(saved), owner).get(0);
    }

    /**
     * Full-list reorder for one group of items (a step, or the ungrouped bucket when
     * {@code stepId} is null) -- same strict contract as {@code ModuleService.reorder}: the
     * ids sent must be exactly that group's items, no more, no fewer.
     */
    @Transactional
    public void reorderItems(UUID trilhaId, UUID stepId, List<UUID> orderedIds, User owner) {
        Trilha trilha = loadForEditing(trilhaId, owner);
        if (stepId != null) {
            requireStepInTrilha(trilha, stepId);
        }

        List<TrilhaItem> groupItems = trilhaItemRepository.findAllByTrilhaOrdered(trilhaId).stream()
                .filter(item -> stepId == null
                        ? item.getStep() == null
                        : item.getStep() != null && item.getStep().getId().equals(stepId))
                .toList();
        Map<UUID, TrilhaItem> byId = groupItems.stream()
                .collect(Collectors.toMap(TrilhaItem::getId, item -> item));

        if (orderedIds.size() != groupItems.size() || !byId.keySet().containsAll(orderedIds)) {
            throw new BadRequestException("A lista de reordenacao deve conter exatamente os itens desta etapa");
        }

        for (int index = 0; index < orderedIds.size(); index++) {
            byId.get(orderedIds.get(index)).setOrderIndex(index);
        }
        trilhaItemRepository.saveAll(byId.values());
    }

    @Transactional
    public void removeItem(UUID trilhaId, UUID itemId, User owner) {
        Trilha trilha = loadForEditing(trilhaId, owner);
        TrilhaItem item = requireItemInTrilha(trilha, itemId);
        // The composite FK cascades: removing an item also drops any course_trilha_highlight and
        // trilha_item_completions rows pointing at it.
        trilhaItemRepository.delete(item);
    }

    // ------------------------------------------------------------------ steps

    @Transactional
    public TrilhaStepResponse createStep(UUID trilhaId, CreateTrilhaStepRequest request, User owner) {
        Trilha trilha = loadForEditing(trilhaId, owner);
        TrilhaStep step = TrilhaStep.builder()
                .trilha(trilha)
                .title(request.title().trim())
                .description(request.description())
                .orderIndex(trilhaStepRepository.findMaxOrder(trilha.getId()) + 1)
                .build();
        TrilhaStep saved = trilhaStepRepository.save(step);
        return new TrilhaStepResponse(saved.getId(), saved.getTitle(), saved.getDescription(), saved.getOrderIndex(), List.of());
    }

    @Transactional
    public TrilhaStepResponse updateStep(UUID trilhaId, UUID stepId, UpdateTrilhaStepRequest request, User owner) {
        Trilha trilha = loadForEditing(trilhaId, owner);
        TrilhaStep step = requireStepInTrilha(trilha, stepId);

        if (request.title() != null) {
            step.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            step.setDescription(request.description());
        }
        TrilhaStep saved = trilhaStepRepository.save(step);
        List<TrilhaItemResponse> items = trilhaMapper.toItemResponses(
                trilhaItemRepository.findAllByTrilhaOrdered(trilha.getId()).stream()
                        .filter(item -> item.getStep() != null && item.getStep().getId().equals(stepId))
                        .toList(),
                owner);
        return new TrilhaStepResponse(saved.getId(), saved.getTitle(), saved.getDescription(), saved.getOrderIndex(), items);
    }

    @Transactional
    public void deleteStep(UUID trilhaId, UUID stepId, User owner) {
        Trilha trilha = loadForEditing(trilhaId, owner);
        TrilhaStep step = requireStepInTrilha(trilha, stepId);
        // Its items cascade with it (ON DELETE CASCADE on trilha_items.step_id).
        trilhaStepRepository.delete(step);
    }

    @Transactional
    public void reorderSteps(UUID trilhaId, List<UUID> orderedIds, User owner) {
        Trilha trilha = loadForEditing(trilhaId, owner);
        Map<UUID, TrilhaStep> byId = trilhaStepRepository.findByTrilhaOrdered(trilha.getId()).stream()
                .collect(Collectors.toMap(TrilhaStep::getId, step -> step));
        for (int index = 0; index < orderedIds.size(); index++) {
            TrilhaStep step = byId.get(orderedIds.get(index));
            if (step == null) {
                throw new BadRequestException("Etapa nao pertence a esta trilha");
            }
            step.setOrderIndex(index);
        }
        trilhaStepRepository.saveAll(byId.values());
    }

    // ------------------------------------------------------------- highlights

    /** All trilhas containing this course, paginated -- backs the "ver mais" button. */
    @Transactional(readOnly = true)
    public PageResponse<TrilhaSummary> trilhasContainingCourse(UUID courseId, int page, int size, User viewer) {
        Page<Trilha> result = trilhaRepository.findContainingCourse(courseId,
                viewer == null ? null : viewer.getId(),
                PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));
        return PageResponse.of(result, trilhaMapper.toSummaries(result.getContent(), viewer));
    }

    @Transactional(readOnly = true)
    public PageResponse<TrilhaSummary> trilhasContainingPost(UUID postId, int page, int size, User viewer) {
        Page<Trilha> result = trilhaRepository.findContainingPost(postId,
                viewer == null ? null : viewer.getId(),
                PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));
        return PageResponse.of(result, trilhaMapper.toSummaries(result.getContent(), viewer));
    }

    /**
     * The default, curated set shown on the course page. Falls back to the most recent trilhas
     * containing the course until the course owner picks a curation of their own -- the frontend
     * still offers "ver mais" to page through the full list regardless.
     */
    @Transactional(readOnly = true)
    public List<TrilhaSummary> listHighlighted(UUID courseId, User viewer) {
        List<UUID> chosenIds = highlightRepository.findTrilhaIdsByCourseId(courseId);
        if (!chosenIds.isEmpty()) {
            return chosenIds.stream()
                    .map(trilhaRepository::findByIdWithOwner)
                    .flatMap(java.util.Optional::stream)
                    .filter(trilha -> canView(trilha, viewer))
                    .map(trilha -> trilhaMapper.toSummary(trilha, viewer))
                    .toList();
        }
        return trilhasContainingCourse(courseId, 0, MAX_HIGHLIGHTS, viewer).items();
    }

    @Transactional
    public void setHighlight(UUID courseId, UUID trilhaId, User owner) {
        Course course = requireOwnedCourse(courseId, owner);
        if (!trilhaItemRepository.existsByTrilhaIdAndCourseId(trilhaId, courseId)) {
            throw new BadRequestException("Este curso nao pertence a essa trilha");
        }
        if (highlightRepository.countByIdCourseId(course.getId()) >= MAX_HIGHLIGHTS) {
            throw new BadRequestException("Limite de " + MAX_HIGHLIGHTS + " trilhas em destaque");
        }
        highlightRepository.save(CourseTrilhaHighlight.of(course.getId(), trilhaId));
    }

    @Transactional
    public void removeHighlight(UUID courseId, UUID trilhaId, User owner) {
        requireOwnedCourse(courseId, owner);
        highlightRepository.deleteById(new CourseTrilhaId(courseId, trilhaId));
    }

    // ---------------------------------------------------------------- helpers

    private TrilhaDetail toDetail(Trilha trilha, User viewer) {
        boolean enrolledByMe = viewer != null
                && trilhaEnrollmentRepository.findEnrolledTrilhaIds(viewer.getId(), List.of(trilha.getId()))
                        .contains(trilha.getId());
        TrilhaProgressResponse progress = null;
        if (viewer != null) {
            List<UUID> completed = trilhaItemCompletionRepository.findCompletedItemIds(viewer.getId(), trilha.getId());
            long total = trilhaItemRepository.countByTrilhaId(trilha.getId());
            int percentage = total == 0 ? 0 : (int) Math.round(completed.size() * 100.0 / total);
            progress = new TrilhaProgressResponse(completed.size(), total, percentage);
        }
        TrilhaStructure structure = trilhaMapper.toStructure(
                trilhaStepRepository.findByTrilhaOrdered(trilha.getId()),
                trilhaItemRepository.findAllByTrilhaOrdered(trilha.getId()),
                viewer);
        return new TrilhaDetail(trilhaMapper.toSummary(trilha, viewer), isOwner(trilha, viewer), enrolledByMe, progress,
                structure);
    }

    /** Next free position in the given scope: within {@code step}, or among ungrouped items. */
    private int nextOrderIndex(UUID trilhaId, TrilhaStep step) {
        return (step == null ? trilhaItemRepository.findMaxOrderUngrouped(trilhaId)
                : trilhaItemRepository.findMaxOrderInStep(step.getId())) + 1;
    }

    private TrilhaStep requireStepInTrilha(Trilha trilha, UUID stepId) {
        TrilhaStep step = trilhaStepRepository.findByIdWithTrilha(stepId)
                .orElseThrow(() -> ResourceNotFoundException.of("Etapa"));
        if (!step.getTrilha().getId().equals(trilha.getId())) {
            throw ResourceNotFoundException.of("Etapa");
        }
        return step;
    }

    @Transactional(readOnly = true)
    public Trilha loadVisible(UUID id, User viewer) {
        Trilha trilha = trilhaRepository.findByIdWithOwner(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Trilha"));
        requireVisible(trilha, viewer);
        return trilha;
    }

    @Transactional(readOnly = true)
    public Trilha loadForEditing(UUID id, User viewer) {
        Trilha trilha = trilhaRepository.findByIdWithOwner(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Trilha"));
        if (!isOwner(trilha, viewer)) {
            requireVisible(trilha, viewer);
            throw new ForbiddenException("Apenas o dono da trilha pode fazer isso");
        }
        return trilha;
    }

    public boolean isOwner(Trilha trilha, User viewer) {
        return viewer != null && trilha.getOwner().getId().equals(viewer.getId());
    }

    private boolean canView(Trilha trilha, User viewer) {
        return trilha.isPublished() || isOwner(trilha, viewer) || (viewer != null && viewer.isAdmin());
    }

    private void requireVisible(Trilha trilha, User viewer) {
        if (!canView(trilha, viewer)) {
            throw ResourceNotFoundException.of("Trilha");
        }
    }

    private TrilhaItem requireItemInTrilha(Trilha trilha, UUID itemId) {
        TrilhaItem item = trilhaItemRepository.findByIdWithTrilha(itemId)
                .orElseThrow(() -> ResourceNotFoundException.of("Item da trilha"));
        if (!item.getTrilha().getId().equals(trilha.getId())) {
            throw ResourceNotFoundException.of("Item da trilha");
        }
        return item;
    }

    private Course requireOwnedCourse(UUID courseId, User owner) {
        Course course = courseRepository.findByIdWithOwner(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Curso"));
        if (!course.getOwner().getId().equals(owner.getId())) {
            throw new ForbiddenException("Apenas o dono do curso pode fazer isso");
        }
        return course;
    }

    private void requireNickname(User owner) {
        if (owner.getNickname() == null || owner.getNickname().isBlank()) {
            throw new BadRequestException("Defina seu nickname antes de criar conteudo");
        }
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}

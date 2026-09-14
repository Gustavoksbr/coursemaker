package com.coursemaker.service;

import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.LibraryFolder;
import com.coursemaker.domain.entity.LibraryItem;
import com.coursemaker.domain.entity.Post;
import com.coursemaker.domain.entity.Trilha;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.library.LibraryDtos.CreateLibraryFolderRequest;
import com.coursemaker.dto.library.LibraryDtos.LibraryFolderResponse;
import com.coursemaker.dto.library.LibraryDtos.LibraryItemResponse;
import com.coursemaker.dto.library.LibraryDtos.LibraryOverviewItem;
import com.coursemaker.dto.library.LibraryDtos.LibraryStatusResponse;
import com.coursemaker.dto.library.LibraryDtos.UpdateLibraryFolderRequest;
import com.coursemaker.dto.post.PostDtos.PostSummary;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaSummary;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.LibraryFolderRepository;
import com.coursemaker.repository.LibraryItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * A user's personal library: courses/posts/trilhas they saved, always inside one of the folders
 * they name themselves (a la a chess.com game library). "Favoritos" is not a separate concept --
 * it is simply the {@code isDefault} folder every user gets: where a save lands when no folder is
 * picked, listed first, and the only one that cannot be renamed or deleted.
 */
@Service
@RequiredArgsConstructor
public class LibraryService {

    private static final int MAX_PAGE_SIZE = 50;
    private static final String DEFAULT_FOLDER_NAME = "Favoritos";

    private final LibraryItemRepository itemRepository;
    private final LibraryFolderRepository folderRepository;
    private final CourseService courseService;
    private final PostService postService;
    private final TrilhaService trilhaService;
    private final EnrollmentService enrollmentService;
    private final CourseMapper courseMapper;
    private final PostMapper postMapper;
    private final TrilhaMapper trilhaMapper;

    /**
     * "Meus cursos e trilhas": every enrolled course plus every followed trilha, one row each,
     * newest interaction first. Backs the table view - see {@link LibraryOverviewItem}.
     */
    @Transactional(readOnly = true)
    public List<LibraryOverviewItem> myOverview(User user) {
        List<LibraryOverviewItem> items = new java.util.ArrayList<>(enrollmentService.myLibraryOverview(user));
        items.addAll(trilhaService.myLibraryOverview(user));
        items.sort(java.util.Comparator.comparing(LibraryOverviewItem::lastInteraction).reversed());
        return items;
    }

    // ---------------------------------------------------------- save/unsave

    /** Whether this content is saved, and in which folder (non-null whenever {@code saved}). */
    @Transactional(readOnly = true)
    public LibraryStatusResponse statusForCourse(UUID courseId, User user) {
        return itemRepository.findByUserAndCourse(user.getId(), courseId)
                .map(this::toStatus)
                .orElseGet(LibraryService::notSaved);
    }

    @Transactional
    public LibraryStatusResponse unsaveCourse(UUID courseId, User user) {
        itemRepository.findByUserAndCourse(user.getId(), courseId).ifPresent(itemRepository::delete);
        return notSaved();
    }

    /**
     * Saves (or re-files) the course into a folder; a null {@code folderId} falls back to the
     * user's Favoritos folder. This is also how a first save happens -- there is no separate
     * "favorite" action, every save goes through the folder picker.
     */
    @Transactional
    public LibraryStatusResponse moveCourseToFolder(UUID courseId, UUID folderId, User user) {
        Course course = courseService.loadVisible(courseId, user);
        LibraryFolder folder = resolveFolder(folderId, user);
        LibraryItem item = itemRepository.findByUserAndCourse(user.getId(), courseId)
                .orElseGet(() -> LibraryItem.builder().user(user).course(course).build());
        item.setFolder(folder);
        return toStatus(itemRepository.save(item));
    }

    @Transactional(readOnly = true)
    public LibraryStatusResponse statusForPost(UUID postId, User user) {
        return itemRepository.findByUserAndPost(user.getId(), postId)
                .map(this::toStatus)
                .orElseGet(LibraryService::notSaved);
    }

    @Transactional
    public LibraryStatusResponse unsavePost(UUID postId, User user) {
        itemRepository.findByUserAndPost(user.getId(), postId).ifPresent(itemRepository::delete);
        return notSaved();
    }

    @Transactional
    public LibraryStatusResponse movePostToFolder(UUID postId, UUID folderId, User user) {
        Post post = postService.loadVisible(postId, user);
        LibraryFolder folder = resolveFolder(folderId, user);
        LibraryItem item = itemRepository.findByUserAndPost(user.getId(), postId)
                .orElseGet(() -> LibraryItem.builder().user(user).post(post).build());
        item.setFolder(folder);
        return toStatus(itemRepository.save(item));
    }

    @Transactional(readOnly = true)
    public LibraryStatusResponse statusForTrilha(UUID trilhaId, User user) {
        return itemRepository.findByUserAndTrilha(user.getId(), trilhaId)
                .map(this::toStatus)
                .orElseGet(LibraryService::notSaved);
    }

    @Transactional
    public LibraryStatusResponse unsaveTrilha(UUID trilhaId, User user) {
        itemRepository.findByUserAndTrilha(user.getId(), trilhaId).ifPresent(itemRepository::delete);
        return notSaved();
    }

    @Transactional
    public LibraryStatusResponse moveTrilhaToFolder(UUID trilhaId, UUID folderId, User user) {
        Trilha trilha = trilhaService.loadVisible(trilhaId, user);
        LibraryFolder folder = resolveFolder(folderId, user);
        LibraryItem item = itemRepository.findByUserAndTrilha(user.getId(), trilhaId)
                .orElseGet(() -> LibraryItem.builder().user(user).trilha(trilha).build());
        item.setFolder(folder);
        return toStatus(itemRepository.save(item));
    }

    // -------------------------------------------------------------- folders

    @Transactional
    public List<LibraryFolderResponse> listFolders(User user, UUID areaId) {
        ensureDefaultFolder(user);
        List<LibraryFolder> folders = folderRepository.findByUserOrdered(user.getId());
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] row : itemRepository.countByFolderForUser(user.getId(), areaId)) {
            counts.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return folders.stream()
                .map(folder -> toResponse(folder, counts.getOrDefault(folder.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public LibraryFolderResponse getFolder(UUID folderId, User user, UUID areaId) {
        LibraryFolder folder = requireOwnedFolder(folderId, user);
        return toResponse(folder, itemRepository.countByFolderId(folderId, areaId));
    }

    @Transactional(readOnly = true)
    public PageResponse<LibraryItemResponse> listFolderItems(UUID folderId, User user, UUID areaId, int page, int size) {
        requireOwnedFolder(folderId, user);
        Page<LibraryItem> result = itemRepository.findByUserAndFolderOrdered(user.getId(), folderId, areaId,
                PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));
        return PageResponse.of(result, toItemResponses(result.getContent(), user));
    }

    @Transactional
    public LibraryFolderResponse createFolder(CreateLibraryFolderRequest request, User user) {
        ensureDefaultFolder(user);
        String name = request.name().trim();
        if (folderRepository.existsByUserIdAndNameIgnoreCase(user.getId(), name)) {
            throw new BadRequestException("Voce ja tem uma pasta com esse nome");
        }
        LibraryFolder saved = folderRepository.save(LibraryFolder.builder().user(user).name(name).build());
        return toResponse(saved, 0);
    }

    @Transactional
    public LibraryFolderResponse renameFolder(UUID folderId, UpdateLibraryFolderRequest request, User user) {
        LibraryFolder folder = requireEditableFolder(folderId, user, "renomeada");
        String name = request.name().trim();
        if (folderRepository.existsByUserIdAndNameIgnoreCaseAndIdNot(user.getId(), name, folder.getId())) {
            throw new BadRequestException("Voce ja tem uma pasta com esse nome");
        }
        folder.setName(name);
        LibraryFolder saved = folderRepository.save(folder);
        return toResponse(saved, itemRepository.countByFolderId(saved.getId(), null));
    }

    @Transactional
    public void deleteFolder(UUID folderId, User user) {
        LibraryFolder folder = requireEditableFolder(folderId, user, "excluida");
        // The saves survive the folder: they fall back to Favoritos. The FK cascade would delete
        // them instead, so this has to happen first and explicitly.
        itemRepository.refileAll(folder.getId(), ensureDefaultFolder(user));
        folderRepository.delete(folder);
    }

    // ---------------------------------------------------------------- helpers

    /**
     * Every user has a Favoritos folder, but it is created on first use rather than at signup, so
     * that accounts predating this feature (and any created by other flows) get one too.
     */
    private LibraryFolder ensureDefaultFolder(User user) {
        return folderRepository.findDefaultByUser(user.getId())
                .orElseGet(() -> folderRepository.save(LibraryFolder.builder()
                        .user(user)
                        .name(DEFAULT_FOLDER_NAME)
                        .isDefault(true)
                        .build()));
    }

    private LibraryFolder resolveFolder(UUID folderId, User user) {
        return folderId == null ? ensureDefaultFolder(user) : requireOwnedFolder(folderId, user);
    }

    private LibraryFolder requireOwnedFolder(UUID folderId, User user) {
        LibraryFolder folder = folderRepository.findByIdWithUser(folderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Pasta"));
        // 404, not 403: no reason to confirm to a stranger that this folder id belongs to someone.
        if (!folder.getUser().getId().equals(user.getId())) {
            throw ResourceNotFoundException.of("Pasta");
        }
        return folder;
    }

    private LibraryFolder requireEditableFolder(UUID folderId, User user, String attemptedAction) {
        LibraryFolder folder = requireOwnedFolder(folderId, user);
        if (folder.isDefault()) {
            throw new BadRequestException("A pasta " + DEFAULT_FOLDER_NAME + " nao pode ser " + attemptedAction);
        }
        return folder;
    }

    private static LibraryStatusResponse notSaved() {
        return new LibraryStatusResponse(false, null);
    }

    private LibraryStatusResponse toStatus(LibraryItem item) {
        return new LibraryStatusResponse(true, item.getFolder().getId());
    }

    private static LibraryFolderResponse toResponse(LibraryFolder folder, long itemCount) {
        return new LibraryFolderResponse(folder.getId(), folder.getName(), itemCount,
                folder.isDefault(), folder.getCreatedAt());
    }

    /** Batches the summary lookups by type instead of one query per row. */
    private List<LibraryItemResponse> toItemResponses(List<LibraryItem> items, User user) {
        if (items.isEmpty()) {
            return List.of();
        }

        List<Course> courses = items.stream().map(LibraryItem::getCourse).filter(Objects::nonNull).toList();
        List<Post> posts = items.stream().map(LibraryItem::getPost).filter(Objects::nonNull).toList();
        List<Trilha> trilhas = items.stream().map(LibraryItem::getTrilha).filter(Objects::nonNull).toList();

        Map<UUID, CourseSummary> courseSummaries = courseMapper.toSummaries(courses, user).stream()
                .collect(Collectors.toMap(CourseSummary::id, s -> s));
        Map<UUID, PostSummary> postSummaries = postMapper.toSummaries(posts, user).stream()
                .collect(Collectors.toMap(PostSummary::id, s -> s));
        Map<UUID, TrilhaSummary> trilhaSummaries = trilhaMapper.toSummaries(trilhas, user).stream()
                .collect(Collectors.toMap(TrilhaSummary::id, s -> s));

        return items.stream()
                .map(item -> new LibraryItemResponse(
                        item.getId(),
                        item.getCourse() == null ? null : courseSummaries.get(item.getCourse().getId()),
                        item.getPost() == null ? null : postSummaries.get(item.getPost().getId()),
                        item.getTrilha() == null ? null : trilhaSummaries.get(item.getTrilha().getId()),
                        item.getFolder().getId(),
                        item.getCreatedAt()))
                .toList();
    }
}

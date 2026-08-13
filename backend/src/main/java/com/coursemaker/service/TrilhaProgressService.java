package com.coursemaker.service;

import com.coursemaker.domain.entity.CompositeIds.UserTrilhaId;
import com.coursemaker.domain.entity.CompositeIds.UserTrilhaItemId;
import com.coursemaker.domain.entity.Trilha;
import com.coursemaker.domain.entity.TrilhaEnrollment;
import com.coursemaker.domain.entity.TrilhaItem;
import com.coursemaker.domain.entity.TrilhaItemCompletion;
import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.EntityKind;
import com.coursemaker.domain.enums.NotificationType;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaProgressResponse;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.TrilhaEnrollmentRepository;
import com.coursemaker.repository.TrilhaItemCompletionRepository;
import com.coursemaker.repository.TrilhaItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Trilha-level enrollment ("following" a trilha) and manual item completion. Mirrors the
 * {@link com.coursemaker.service.EnrollmentService}/{@link ProgressService} split used for
 * courses: enrollment and completion are independent concerns.
 */
@Service
@RequiredArgsConstructor
public class TrilhaProgressService {

    private final TrilhaEnrollmentRepository enrollmentRepository;
    private final TrilhaItemCompletionRepository completionRepository;
    private final TrilhaItemRepository trilhaItemRepository;
    private final TrilhaService trilhaService;
    private final NotificationService notificationService;

    @Transactional
    public void enroll(UUID trilhaId, User user) {
        Trilha trilha = trilhaService.loadVisible(trilhaId, user);
        UserTrilhaId key = new UserTrilhaId(user.getId(), trilha.getId());
        if (!enrollmentRepository.existsById(key)) {
            enrollmentRepository.save(TrilhaEnrollment.of(user.getId(), trilha.getId()));
            notificationService.notify(trilha.getOwner(), user, NotificationType.TRILHA_FOLLOW, EntityKind.TRILHA,
                    trilha.getId(), trilha.getTitle(),
                    "/trilhas/" + trilha.getOwner().getNickname() + "/" + trilha.getSlug());
        }
    }

    @Transactional
    public void unenroll(UUID trilhaId, User user) {
        enrollmentRepository.deleteById(new UserTrilhaId(user.getId(), trilhaId));
    }

    @Transactional
    public TrilhaProgressResponse markComplete(UUID itemId, User user) {
        TrilhaItem item = loadItem(itemId, user);
        UserTrilhaItemId key = new UserTrilhaItemId(user.getId(), item.getId());
        if (!completionRepository.existsById(key)) {
            completionRepository.save(TrilhaItemCompletion.of(user.getId(), item.getId()));
        }
        return progressOf(item.getTrilha(), user);
    }

    @Transactional
    public TrilhaProgressResponse markIncomplete(UUID itemId, User user) {
        TrilhaItem item = loadItem(itemId, user);
        completionRepository.deleteById(new UserTrilhaItemId(user.getId(), item.getId()));
        return progressOf(item.getTrilha(), user);
    }

    @Transactional(readOnly = true)
    public TrilhaProgressResponse getProgress(UUID trilhaId, User user) {
        return progressOf(trilhaService.loadVisible(trilhaId, user), user);
    }

    private TrilhaProgressResponse progressOf(Trilha trilha, User user) {
        List<UUID> completed = completionRepository.findCompletedItemIds(user.getId(), trilha.getId());
        long total = trilhaItemRepository.countByTrilhaId(trilha.getId());
        int percentage = total == 0 ? 0 : (int) Math.round(completed.size() * 100.0 / total);
        return new TrilhaProgressResponse(completed.size(), total, percentage);
    }

    private TrilhaItem loadItem(UUID itemId, User viewer) {
        TrilhaItem item = trilhaItemRepository.findByIdWithTrilha(itemId)
                .orElseThrow(() -> ResourceNotFoundException.of("Item da trilha"));
        trilhaService.loadVisible(item.getTrilha().getId(), viewer);
        return item;
    }
}

package com.coursemaker.service;

import com.coursemaker.domain.entity.CompositeIds.UserLessonId;
import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.Lesson;
import com.coursemaker.domain.entity.LessonCompletion;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.course.CourseDtos.ProgressResponse;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.repository.LessonCompletionRepository;
import com.coursemaker.repository.LessonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Lesson completion tracking, only available when the course opts in via {@code progressEnabled}. */
@Service
@RequiredArgsConstructor
public class ProgressService {

    private final LessonCompletionRepository completionRepository;
    private final LessonRepository lessonRepository;
    private final LessonService lessonService;
    private final CourseService courseService;

    @Transactional
    public ProgressResponse markComplete(UUID lessonId, User user) {
        Lesson lesson = lessonService.loadVisible(lessonId, user);
        Course course = lesson.getModule().getCourse();
        requireProgressEnabled(course);

        UserLessonId key = new UserLessonId(user.getId(), lessonId);
        if (!completionRepository.existsById(key)) {
            completionRepository.save(LessonCompletion.of(user.getId(), lessonId));
        }
        return progressOf(course, user);
    }

    @Transactional
    public ProgressResponse markIncomplete(UUID lessonId, User user) {
        Lesson lesson = lessonService.loadVisible(lessonId, user);
        Course course = lesson.getModule().getCourse();
        requireProgressEnabled(course);

        completionRepository.deleteById(new UserLessonId(user.getId(), lessonId));
        return progressOf(course, user);
    }

    @Transactional
    public ProgressResponse getProgress(UUID courseId, User user) {
        Course course = courseService.loadVisible(courseId, user);
        return progressOf(course, user);
    }

    private ProgressResponse progressOf(Course course, User user) {
        List<UUID> completed = completionRepository.findCompletedLessonIds(user.getId(), course.getId());
        long total = lessonRepository.countByCourseId(course.getId());
        int percentage = total == 0 ? 0 : (int) Math.round(completed.size() * 100.0 / total);
        return new ProgressResponse(completed.size(), total, percentage, completed);
    }

    private void requireProgressEnabled(Course course) {
        if (!course.isProgressEnabled()) {
            throw new BadRequestException("Este curso nao acompanha progresso de licoes");
        }
    }
}

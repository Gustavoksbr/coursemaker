package com.coursemaker.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite primary keys for the association tables. They hold raw ids rather than entity
 * references: these rows only ever answer "does this link exist?" and "how many are there?", so
 * loading the whole aggregate would be wasted work.
 */
public final class CompositeIds {

    private CompositeIds() {
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class UserCourseId implements Serializable {

        @Column(name = "user_id", nullable = false)
        private UUID userId;

        @Column(name = "course_id", nullable = false)
        private UUID courseId;
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class UserPostId implements Serializable {

        @Column(name = "user_id", nullable = false)
        private UUID userId;

        @Column(name = "post_id", nullable = false)
        private UUID postId;
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class UserLessonId implements Serializable {

        @Column(name = "user_id", nullable = false)
        private UUID userId;

        @Column(name = "lesson_id", nullable = false)
        private UUID lessonId;
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class CourseUserId implements Serializable {

        @Column(name = "course_id", nullable = false)
        private UUID courseId;

        @Column(name = "user_id", nullable = false)
        private UUID userId;
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class UserTrilhaId implements Serializable {

        @Column(name = "user_id", nullable = false)
        private UUID userId;

        @Column(name = "trilha_id", nullable = false)
        private UUID trilhaId;
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class UserTrilhaItemId implements Serializable {

        @Column(name = "user_id", nullable = false)
        private UUID userId;

        @Column(name = "trilha_item_id", nullable = false)
        private UUID trilhaItemId;
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class CourseTrilhaId implements Serializable {

        @Column(name = "course_id", nullable = false)
        private UUID courseId;

        @Column(name = "trilha_id", nullable = false)
        private UUID trilhaId;
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class SchoolUserId implements Serializable {

        @Column(name = "school_id", nullable = false)
        private UUID schoolId;

        @Column(name = "user_id", nullable = false)
        private UUID userId;
    }
}

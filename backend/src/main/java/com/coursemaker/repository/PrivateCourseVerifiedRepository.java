package com.coursemaker.repository;

import com.coursemaker.domain.entity.CompositeIds.UserCourseId;
import com.coursemaker.domain.entity.PrivateCourseVerified;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrivateCourseVerifiedRepository extends JpaRepository<PrivateCourseVerified, UserCourseId> {
}

package com.coursemaker.repository;

import com.coursemaker.domain.entity.CompositeIds.UserPostId;
import com.coursemaker.domain.entity.PrivatePostVerified;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrivatePostVerifiedRepository extends JpaRepository<PrivatePostVerified, UserPostId> {
}

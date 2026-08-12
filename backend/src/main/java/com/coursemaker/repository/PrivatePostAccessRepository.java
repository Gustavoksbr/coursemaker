package com.coursemaker.repository;

import com.coursemaker.domain.entity.CompositeIds.UserPostId;
import com.coursemaker.domain.entity.PrivatePostAccess;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrivatePostAccessRepository extends JpaRepository<PrivatePostAccess, UserPostId> {
}

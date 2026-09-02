package com.coursemaker.repository;

import com.coursemaker.domain.entity.Testimonial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TestimonialRepository extends JpaRepository<Testimonial, UUID> {

    /** Public listing: only what the admin published, in the order they arranged. */
    List<Testimonial> findByPublishedTrueOrderByOrderIndexAscCreatedAtAsc();

    /** Admin listing: everything, published or not. */
    List<Testimonial> findAllByOrderByOrderIndexAscCreatedAtAsc();
}

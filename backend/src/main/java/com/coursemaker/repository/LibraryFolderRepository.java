package com.coursemaker.repository;

import com.coursemaker.domain.entity.LibraryFolder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LibraryFolderRepository extends JpaRepository<LibraryFolder, UUID> {

    /** Favoritos (the default folder) always comes first; the rest by age. */
    @Query("SELECT f FROM LibraryFolder f WHERE f.user.id = :userId ORDER BY f.isDefault DESC, f.createdAt")
    List<LibraryFolder> findByUserOrdered(@Param("userId") UUID userId);

    @Query("SELECT f FROM LibraryFolder f WHERE f.user.id = :userId AND f.isDefault = true")
    Optional<LibraryFolder> findDefaultByUser(@Param("userId") UUID userId);

    @Query("SELECT f FROM LibraryFolder f JOIN FETCH f.user WHERE f.id = :id")
    Optional<LibraryFolder> findByIdWithUser(@Param("id") UUID id);

    boolean existsByUserIdAndNameIgnoreCase(UUID userId, String name);

    boolean existsByUserIdAndNameIgnoreCaseAndIdNot(UUID userId, String name, UUID id);
}

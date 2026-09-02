package com.coursemaker.service;

import com.coursemaker.domain.entity.Area;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.area.AreaDtos.AreaSummary;
import com.coursemaker.dto.area.AreaDtos.CreateAreaRequest;
import com.coursemaker.dto.area.AreaDtos.UpdateAreaRequest;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ConflictException;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.AreaRepository;
import com.coursemaker.repository.CourseRepository;
import com.coursemaker.repository.PostRepository;
import com.coursemaker.repository.TrilhaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Areas are the only admin-curated piece of content taxonomy: an admin manages the fixed list
 * (Programação, Xadrez, ...), and every course/post/trilha owner picks one of the existing areas
 * for their own content - never the other way around, an admin never assigns content to an area.
 */
@Service
@RequiredArgsConstructor
public class AreaService {

    private final AreaRepository areaRepository;
    private final CourseRepository courseRepository;
    private final PostRepository postRepository;
    private final TrilhaRepository trilhaRepository;
    private final SlugGeneratorService slugGenerator;

    @Transactional(readOnly = true)
    public List<AreaSummary> list() {
        return areaRepository.findAllByOrderByNameAsc().stream().map(AreaSummary::from).toList();
    }

    @Transactional
    public AreaSummary create(CreateAreaRequest request, User admin) {
        requireAdmin(admin);
        String name = request.name().trim();
        if (areaRepository.existsByName(name)) {
            throw new ConflictException("Ja existe uma area com esse nome");
        }
        List<String> existingSlugs = areaRepository.findAll().stream().map(Area::getSlug).toList();
        String slug = slugGenerator.uniqueSlug(name, existingSlugs);

        Area area = Area.builder().name(name).slug(slug).build();
        return AreaSummary.from(areaRepository.save(area));
    }

    @Transactional
    public AreaSummary update(UUID id, UpdateAreaRequest request, User admin) {
        requireAdmin(admin);
        Area area = areaRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Area"));

        String name = request.name().trim();
        if (!name.equalsIgnoreCase(area.getName()) && areaRepository.existsByName(name)) {
            throw new ConflictException("Ja existe uma area com esse nome");
        }

        // The slug follows the name. It used to be frozen so an area-scoped content URL would never
        // rot, but content URLs no longer carry the area - the slug now only shows up in the
        // catalogue's `?area=` filter, where a stale slug that disagrees with the visible name is
        // worse than a filter link going stale.
        if (!name.equals(area.getName())) {
            List<String> takenSlugs = areaRepository.findAll().stream()
                    .filter(other -> !other.getId().equals(area.getId()))
                    .map(Area::getSlug)
                    .toList();
            area.setSlug(slugGenerator.uniqueSlug(name, takenSlugs));
        }
        area.setName(name);
        return AreaSummary.from(areaRepository.save(area));
    }

    @Transactional
    public void delete(UUID id, User admin) {
        requireAdmin(admin);
        Area area = areaRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Area"));

        boolean inUse = courseRepository.existsByAreaId(id)
                || postRepository.existsByAreaId(id)
                || trilhaRepository.existsByAreaId(id);
        if (inUse) {
            throw new BadRequestException("Nao e possivel excluir uma area em uso");
        }
        areaRepository.delete(area);
    }

    private void requireAdmin(User user) {
        if (!user.isAdmin()) {
            throw new ForbiddenException("Apenas administradores podem gerenciar areas");
        }
    }
}

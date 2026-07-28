package com.propro.warehouse.repository;

import com.propro.warehouse.model.RouteHistoryEntry;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RouteHistoryRepository extends JpaRepository<RouteHistoryEntry, Long> {
    @EntityGraph(attributePaths = {"startBin", "stops", "stops.binLocation"})
    List<RouteHistoryEntry> findAllByOrderByCreatedAtDesc();
}

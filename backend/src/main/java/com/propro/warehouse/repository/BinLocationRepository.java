package com.propro.warehouse.repository;

import com.propro.warehouse.model.BinLocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BinLocationRepository extends JpaRepository<BinLocation, Long> {
    Optional<BinLocation> findByCode(String code);
    List<BinLocation> findByCodeIn(List<String> codes);
}

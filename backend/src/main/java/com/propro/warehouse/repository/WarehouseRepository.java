package com.propro.warehouse.repository;

import com.propro.warehouse.model.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {
    /** Single-row configuration: the one warehouse, if it exists. */
    Optional<Warehouse> findFirstByOrderByIdAsc();
}

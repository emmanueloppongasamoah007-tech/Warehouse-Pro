package com.propro.warehouse.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.propro.warehouse.dto.WarehouseRequest;
import com.propro.warehouse.model.BinLocation;
import com.propro.warehouse.model.Warehouse;
import com.propro.warehouse.repository.BinLocationRepository;
import com.propro.warehouse.repository.WarehouseRepository;

/**
 * Single-row warehouse configuration.
 *
 * GET returns the current dimensions; PUT replaces them. There is no POST or
 * DELETE - a warehouse always exists (DataSeeder creates one), so the admin
 * edits it rather than creating or removing it.
 */
@RestController
@RequestMapping("/api/warehouse")
public class WarehouseController {

    /** Used when no row exists yet, e.g. a database seeded before this entity. */
    private static final String DEFAULT_NAME = "Main Warehouse";
    private static final double DEFAULT_WIDTH = 40;
    private static final double DEFAULT_HEIGHT = 45;

    private final WarehouseRepository warehouseRepository;
    private final BinLocationRepository binLocationRepository;

    public WarehouseController(WarehouseRepository warehouseRepository,
                                BinLocationRepository binLocationRepository) {
        this.warehouseRepository = warehouseRepository;
        this.binLocationRepository = binLocationRepository;
    }

    /**
     * GET /api/warehouse
     *
     * Creates the default row on first read rather than 404ing, so a client
     * never has to handle "configuration does not exist yet".
     */
    @GetMapping
    public ResponseEntity<Warehouse> get() {
        return ResponseEntity.ok(currentOrDefault());
    }

    /**
     * PUT /api/warehouse
     * Body: { "name": "Main Warehouse", "width": 40, "height": 45 }
     *
     * Rejects dimensions that would leave existing bins outside the floor.
     * Without this the field is decorative: bins keep their absolute
     * coordinates and the optimizer keeps routing to them regardless, so a
     * shrink would silently produce a warehouse whose own contents are out of
     * bounds. Better to name the offending bins and let the admin move them.
     */
    @PutMapping
    public ResponseEntity<Warehouse> update(@RequestBody WarehouseRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");
        }
        if (request.getWidth() <= 0 || request.getHeight() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "width and height must be greater than 0");
        }

        List<String> outOfBounds = binLocationRepository.findAll().stream()
                .filter(bin -> bin.getX() > request.getWidth() || bin.getY() > request.getHeight())
                .map(BinLocation::getCode)
                .sorted()
                .collect(Collectors.toList());
        if (!outOfBounds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "These bins would fall outside a " + request.getWidth() + " x "
                            + request.getHeight() + " warehouse: " + outOfBounds
                            + ". Move or delete them first.");
        }

        Warehouse warehouse = currentOrDefault();
        warehouse.setName(request.getName());
        warehouse.setWidth(request.getWidth());
        warehouse.setHeight(request.getHeight());
        return ResponseEntity.ok(warehouseRepository.save(warehouse));
    }

    private Warehouse currentOrDefault() {
        return warehouseRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> warehouseRepository.save(
                        new Warehouse(DEFAULT_NAME, DEFAULT_WIDTH, DEFAULT_HEIGHT)));
    }
}

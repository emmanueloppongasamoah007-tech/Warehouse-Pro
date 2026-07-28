package com.propro.warehouse.controller;

import com.propro.warehouse.dto.BinLocationRequest;
import com.propro.warehouse.model.Aisle;
import com.propro.warehouse.model.BinLocation;
import com.propro.warehouse.repository.AisleRepository;
import com.propro.warehouse.repository.BinLocationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bins")
public class BinLocationController {

    private final BinLocationRepository binLocationRepository;
    private final AisleRepository aisleRepository;

    public BinLocationController(BinLocationRepository binLocationRepository, AisleRepository aisleRepository) {
        this.binLocationRepository = binLocationRepository;
        this.aisleRepository = aisleRepository;
    }

    @GetMapping
    public List<BinLocation> getAll() {
        return binLocationRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<BinLocation> getOne(@PathVariable Long id) {
        return binLocationRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public BinLocation create(@RequestBody BinLocationRequest request) {
        BinLocation bin = new BinLocation(request.getCode(), request.getX(), request.getY());
        bin.setSku(request.getSku());
        if (request.getAisleId() != null) {
            Aisle aisle = aisleRepository.findById(request.getAisleId())
                    .orElseThrow(() -> new IllegalArgumentException("Unknown aisle id: " + request.getAisleId()));
            bin.setAisle(aisle);
        }
        return binLocationRepository.save(bin);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BinLocation> update(@PathVariable Long id, @RequestBody BinLocationRequest request) {
        return binLocationRepository.findById(id).map(bin -> {
            bin.setCode(request.getCode());
            bin.setX(request.getX());
            bin.setY(request.getY());
            bin.setSku(request.getSku());
            if (request.getAisleId() != null) {
                Aisle aisle = aisleRepository.findById(request.getAisleId())
                        .orElseThrow(() -> new IllegalArgumentException("Unknown aisle id: " + request.getAisleId()));
                bin.setAisle(aisle);
            } else {
                bin.setAisle(null);
            }
            return ResponseEntity.ok(binLocationRepository.save(bin));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!binLocationRepository.existsById(id)) return ResponseEntity.notFound().build();
        binLocationRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

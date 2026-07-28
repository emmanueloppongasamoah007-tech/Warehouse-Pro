package com.propro.warehouse.controller;

import com.propro.warehouse.dto.AisleRequest;
import com.propro.warehouse.model.Aisle;
import com.propro.warehouse.model.Zone;
import com.propro.warehouse.repository.AisleRepository;
import com.propro.warehouse.repository.ZoneRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/aisles")
public class AisleController {

    private final AisleRepository aisleRepository;
    private final ZoneRepository zoneRepository;

    public AisleController(AisleRepository aisleRepository, ZoneRepository zoneRepository) {
        this.aisleRepository = aisleRepository;
        this.zoneRepository = zoneRepository;
    }

    @GetMapping
    public List<Aisle> getAll() {
        return aisleRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Aisle> getOne(@PathVariable Long id) {
        return aisleRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Aisle> create(@RequestBody AisleRequest request) {
        Zone zone = zoneRepository.findById(request.getZoneId())
                .orElseThrow(() -> new IllegalArgumentException("Unknown zone id: " + request.getZoneId()));

        Aisle aisle = new Aisle(
                request.getName(),
                Aisle.Orientation.valueOf(request.getOrientation().toUpperCase()),
                request.getPosition(),
                request.getStartPos(),
                request.getEndPos()
        );
        aisle.setZone(zone);
        return ResponseEntity.ok(aisleRepository.save(aisle));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Aisle> update(@PathVariable Long id, @RequestBody AisleRequest request) {
        return aisleRepository.findById(id).map(aisle -> {
            aisle.setName(request.getName());
            aisle.setOrientation(Aisle.Orientation.valueOf(request.getOrientation().toUpperCase()));
            aisle.setPosition(request.getPosition());
            aisle.setStartPos(request.getStartPos());
            aisle.setEndPos(request.getEndPos());
            if (request.getZoneId() != null) {
                Zone zone = zoneRepository.findById(request.getZoneId())
                        .orElseThrow(() -> new IllegalArgumentException("Unknown zone id: " + request.getZoneId()));
                aisle.setZone(zone);
            }
            return ResponseEntity.ok(aisleRepository.save(aisle));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!aisleRepository.existsById(id)) return ResponseEntity.notFound().build();
        aisleRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

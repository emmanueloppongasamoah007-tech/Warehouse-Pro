package com.propro.warehouse.controller;

import com.propro.warehouse.dto.ZoneRequest;
import com.propro.warehouse.model.Zone;
import com.propro.warehouse.repository.ZoneRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/zones")
public class ZoneController {

    private final ZoneRepository zoneRepository;

    public ZoneController(ZoneRepository zoneRepository) {
        this.zoneRepository = zoneRepository;
    }

    @GetMapping
    public List<Zone> getAll() {
        return zoneRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Zone> getOne(@PathVariable Long id) {
        return zoneRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Zone create(@RequestBody ZoneRequest request) {
        Zone zone = new Zone(request.getName(), request.getZoneType());
        return zoneRepository.save(zone);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Zone> update(@PathVariable Long id, @RequestBody ZoneRequest request) {
        return zoneRepository.findById(id).map(zone -> {
            zone.setName(request.getName());
            zone.setZoneType(request.getZoneType());
            return ResponseEntity.ok(zoneRepository.save(zone));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!zoneRepository.existsById(id)) return ResponseEntity.notFound().build();
        zoneRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

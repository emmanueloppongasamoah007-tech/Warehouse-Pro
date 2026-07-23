package com.propro.warehouse.controller;

import com.propro.warehouse.dto.RouteRequest;
import com.propro.warehouse.dto.RouteResponse;
import com.propro.warehouse.model.BinLocation;
import com.propro.warehouse.repository.BinLocationRepository;
import com.propro.warehouse.service.PathfindingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/routes")
public class RouteController {

    private final PathfindingService pathfindingService;
    private final BinLocationRepository binLocationRepository;

    public RouteController(PathfindingService pathfindingService, BinLocationRepository binLocationRepository) {
        this.pathfindingService = pathfindingService;
        this.binLocationRepository = binLocationRepository;
    }

    /**
     * POST /api/routes/optimize
     * Body: { "startCode": "PACK-01", "pickListCodes": ["A1-B03", "A2-B10", ...] }
     * Returns the optimized visiting order and total distance.
     */
    @PostMapping("/optimize")
    public ResponseEntity<RouteResponse> optimize(@RequestBody RouteRequest request) {
        BinLocation start = binLocationRepository.findByCode(request.getStartCode())
                .orElseThrow(() -> new IllegalArgumentException("Unknown start bin: " + request.getStartCode()));

        List<BinLocation> pickList = binLocationRepository.findByCodeIn(request.getPickListCodes());

        List<BinLocation> optimizedRoute = pathfindingService.solvePickRoute(start, pickList);
        double totalDistance = pathfindingService.totalDistance(optimizedRoute);

        List<String> orderedCodes = optimizedRoute.stream()
                .map(BinLocation::getCode)
                .collect(Collectors.toList());

        return ResponseEntity.ok(new RouteResponse(orderedCodes, totalDistance));
    }
}

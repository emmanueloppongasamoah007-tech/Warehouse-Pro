package com.propro.warehouse.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.propro.warehouse.dto.RouteAnalyticsResponse;
import com.propro.warehouse.dto.RouteHistoryResponse;
import com.propro.warehouse.dto.RouteRequest;
import com.propro.warehouse.dto.RouteResponse;
import com.propro.warehouse.model.Aisle;
import com.propro.warehouse.model.BinLocation;
import com.propro.warehouse.model.RouteHistoryEntry;
import com.propro.warehouse.repository.AisleRepository;
import com.propro.warehouse.repository.BinLocationRepository;
import com.propro.warehouse.repository.RouteHistoryRepository;
import com.propro.warehouse.service.PathfindingService;

@RestController
@RequestMapping("/api/routes")
public class RouteController {

    private final PathfindingService pathfindingService;
    private final BinLocationRepository binLocationRepository;
    private final AisleRepository aisleRepository;
    private final RouteHistoryRepository routeHistoryRepository;

    public RouteController(PathfindingService pathfindingService,
                            BinLocationRepository binLocationRepository,
                            AisleRepository aisleRepository,
                            RouteHistoryRepository routeHistoryRepository) {
        this.pathfindingService = pathfindingService;
        this.binLocationRepository = binLocationRepository;
        this.aisleRepository = aisleRepository;
        this.routeHistoryRepository = routeHistoryRepository;
    }

    /**
     * POST /api/routes/optimize
     * Body: { "startCode": "PACK-01", "pickListCodes": ["A1-B03", "A2-B10", ...] }
     * Returns the optimized visiting order and total aisle-constrained walking distance.
     */
    @PostMapping("/optimize")
    public ResponseEntity<RouteResponse> optimize(@RequestBody RouteRequest request) {
        BinLocation start = binLocationRepository.findByCode(request.getStartCode())
                .orElseThrow(() -> new IllegalArgumentException("Unknown start bin: " + request.getStartCode()));

        List<String> pickListCodes = request.getPickListCodes() != null ? request.getPickListCodes() : List.of();
        List<BinLocation> pickList = binLocationRepository.findByCodeIn(pickListCodes);
        List<Aisle> allAisles = aisleRepository.findAll();
        List<BinLocation> allBins = binLocationRepository.findAll();

        List<BinLocation> optimizedRoute = pathfindingService.solvePickRoute(start, pickList, allAisles, allBins);
        double totalDistance = pathfindingService.totalDistance(optimizedRoute, allAisles, allBins);

        List<String> orderedCodes = optimizedRoute.stream()
                .map(BinLocation::getCode)
                .collect(Collectors.toList());

        routeHistoryRepository.save(new RouteHistoryEntry(start, optimizedRoute, totalDistance));

        return ResponseEntity.ok(new RouteResponse(orderedCodes, totalDistance));
    }

    @GetMapping("/history")
    public ResponseEntity<List<RouteHistoryResponse>> history() {
        List<RouteHistoryResponse> history = routeHistoryRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(RouteHistoryResponse::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(history);
    }

    @GetMapping("/analytics")
    public ResponseEntity<RouteAnalyticsResponse> analytics() {
        List<RouteHistoryEntry> history = routeHistoryRepository.findAllByOrderByCreatedAtDesc();

        if (history.isEmpty()) {
            return ResponseEntity.ok(new RouteAnalyticsResponse(0, 0.0, 0.0, null));
        }

        double averageDistance = history.stream()
                .mapToDouble(RouteHistoryEntry::getTotalDistance)
                .average()
                .orElse(0.0);

        RouteHistoryEntry latest = history.get(0);
        return ResponseEntity.ok(new RouteAnalyticsResponse(
                history.size(),
                averageDistance,
                latest.getTotalDistance(),
                latest.getCreatedAt()));
    }
}

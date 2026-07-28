package com.propro.warehouse.dto;

import com.propro.warehouse.model.RouteHistoryEntry;
import com.propro.warehouse.model.RouteHistoryStop;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

public class RouteHistoryResponse {

    private Long id;
    private String startCode;
    private List<String> pickListCodes;
    private List<String> orderedBinCodes;
    private double totalDistance;
    private LocalDateTime createdAt;

    public RouteHistoryResponse() {}

    public RouteHistoryResponse(RouteHistoryEntry entry) {
        this.id = entry.getId();
        this.startCode = entry.getStartBin() != null ? entry.getStartBin().getCode() : null;
        this.pickListCodes = entry.getStops().stream()
                .sorted(Comparator.comparingInt(RouteHistoryStop::getStopOrder))
                .map(stop -> stop.getBinLocation().getCode())
                .collect(Collectors.toList());
        this.orderedBinCodes = entry.getStops().stream()
                .sorted(Comparator.comparingInt(RouteHistoryStop::getStopOrder))
                .map(stop -> stop.getBinLocation().getCode())
                .collect(Collectors.toList());
        if (this.startCode != null) {
            this.orderedBinCodes = new java.util.ArrayList<>(this.orderedBinCodes);
            this.orderedBinCodes.add(0, this.startCode);
        }
        this.totalDistance = entry.getTotalDistance();
        this.createdAt = entry.getCreatedAt();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getStartCode() { return startCode; }
    public void setStartCode(String startCode) { this.startCode = startCode; }

    public List<String> getPickListCodes() { return pickListCodes; }
    public void setPickListCodes(List<String> pickListCodes) { this.pickListCodes = pickListCodes; }

    public List<String> getOrderedBinCodes() { return orderedBinCodes; }
    public void setOrderedBinCodes(List<String> orderedBinCodes) { this.orderedBinCodes = orderedBinCodes; }

    public double getTotalDistance() { return totalDistance; }
    public void setTotalDistance(double totalDistance) { this.totalDistance = totalDistance; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

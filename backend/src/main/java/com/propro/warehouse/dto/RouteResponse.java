package com.propro.warehouse.dto;

import java.util.List;

public class RouteResponse {

    private List<String> orderedBinCodes;
    private double totalDistance;

    public RouteResponse() {}

    public RouteResponse(List<String> orderedBinCodes, double totalDistance) {
        this.orderedBinCodes = orderedBinCodes;
        this.totalDistance = totalDistance;
    }

    public List<String> getOrderedBinCodes() { return orderedBinCodes; }
    public void setOrderedBinCodes(List<String> orderedBinCodes) { this.orderedBinCodes = orderedBinCodes; }

    public double getTotalDistance() { return totalDistance; }
    public void setTotalDistance(double totalDistance) { this.totalDistance = totalDistance; }
}

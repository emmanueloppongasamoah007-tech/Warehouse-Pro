package com.propro.warehouse.dto;

import java.time.LocalDateTime;

public class RouteAnalyticsResponse {

    private long totalRoutes;
    private double averageDistance;
    private double latestDistance;
    private LocalDateTime latestTimestamp;

    public RouteAnalyticsResponse() {}

    public RouteAnalyticsResponse(long totalRoutes, double averageDistance, double latestDistance, LocalDateTime latestTimestamp) {
        this.totalRoutes = totalRoutes;
        this.averageDistance = averageDistance;
        this.latestDistance = latestDistance;
        this.latestTimestamp = latestTimestamp;
    }

    public long getTotalRoutes() { return totalRoutes; }
    public void setTotalRoutes(long totalRoutes) { this.totalRoutes = totalRoutes; }

    public double getAverageDistance() { return averageDistance; }
    public void setAverageDistance(double averageDistance) { this.averageDistance = averageDistance; }

    public double getLatestDistance() { return latestDistance; }
    public void setLatestDistance(double latestDistance) { this.latestDistance = latestDistance; }

    public LocalDateTime getLatestTimestamp() { return latestTimestamp; }
    public void setLatestTimestamp(LocalDateTime latestTimestamp) { this.latestTimestamp = latestTimestamp; }
}

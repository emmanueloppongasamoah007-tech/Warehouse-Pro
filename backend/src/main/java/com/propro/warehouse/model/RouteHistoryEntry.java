package com.propro.warehouse.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "route_history")
public class RouteHistoryEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "start_code", referencedColumnName = "code", nullable = false)
    private BinLocation startBin;

    @Column(name = "total_distance", nullable = false)
    private double totalDistance;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "routeHistory", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RouteHistoryStop> stops = new ArrayList<>();

    public RouteHistoryEntry() {}

    public RouteHistoryEntry(BinLocation startBin, List<BinLocation> orderedRoute, double totalDistance) {
        this.startBin = startBin;
        this.totalDistance = totalDistance;
        if (orderedRoute != null) {
            int order = 0;
            for (BinLocation binLocation : orderedRoute) {
                if (binLocation == null || (startBin != null && startBin.getCode().equals(binLocation.getCode()))) {
                    continue;
                }
                addStop(new RouteHistoryStop(this, binLocation, order++));
            }
        }
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public void addStop(RouteHistoryStop stop) {
        stop.setRouteHistory(this);
        stops.add(stop);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public BinLocation getStartBin() { return startBin; }
    public void setStartBin(BinLocation startBin) { this.startBin = startBin; }

    public double getTotalDistance() { return totalDistance; }
    public void setTotalDistance(double totalDistance) { this.totalDistance = totalDistance; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<RouteHistoryStop> getStops() { return stops; }
    public void setStops(List<RouteHistoryStop> stops) { this.stops = stops; }
}

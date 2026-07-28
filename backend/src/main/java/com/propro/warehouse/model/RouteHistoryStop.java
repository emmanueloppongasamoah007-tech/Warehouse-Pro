package com.propro.warehouse.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "route_history_stops")
public class RouteHistoryStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_history_id", nullable = false)
    private RouteHistoryEntry routeHistory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bin_location_id", nullable = false)
    private BinLocation binLocation;

    @Column(name = "stop_order", nullable = false)
    private int stopOrder;

    public RouteHistoryStop() {}

    public RouteHistoryStop(RouteHistoryEntry routeHistory, BinLocation binLocation, int stopOrder) {
        this.routeHistory = routeHistory;
        this.binLocation = binLocation;
        this.stopOrder = stopOrder;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public RouteHistoryEntry getRouteHistory() { return routeHistory; }
    public void setRouteHistory(RouteHistoryEntry routeHistory) { this.routeHistory = routeHistory; }

    public BinLocation getBinLocation() { return binLocation; }
    public void setBinLocation(BinLocation binLocation) { this.binLocation = binLocation; }

    public int getStopOrder() { return stopOrder; }
    public void setStopOrder(int stopOrder) { this.stopOrder = stopOrder; }
}
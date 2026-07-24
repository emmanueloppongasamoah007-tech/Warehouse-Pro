package com.propro.warehouse.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

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
@Table(name = "bin_locations")
public class BinLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "aisle_id", nullable = true)
    @JsonIgnore
    private Aisle aisle;

    // Human-readable bin code, e.g. "A1-B03"
    @Column(nullable = false, unique = true)
    private String code;

    // Coordinates on the warehouse grid - these are what the
    // A*/Dijkstra graph will actually use for distance calculations
    @Column(nullable = false)
    private double x;

    @Column(nullable = false)
    private double y;

    // Optional: SKU currently stored here, useful once we wire up
    // "pick list" -> bin lookups
    @Column(name = "sku")
    private String sku;

    public BinLocation() {}

    public BinLocation(String code, double x, double y) {
        this.code = code;
        this.x = x;
        this.y = y;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Aisle getAisle() { return aisle; }
    public void setAisle(Aisle aisle) { this.aisle = aisle; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public double getX() { return x; }
    public void setX(double x) { this.x = x; }

    public double getY() { return y; }
    public void setY(double y) { this.y = y; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
}

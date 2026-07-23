package com.propro.warehouse.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "zones")
public class Zone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // e.g. "PICKING", "PACKING", "RECEIVING"
    @Column(name = "zone_type")
    private String zoneType;

    @OneToMany(mappedBy = "zone", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Aisle> aisles = new ArrayList<>();

    public Zone() {}

    public Zone(String name, String zoneType) {
        this.name = name;
        this.zoneType = zoneType;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getZoneType() { return zoneType; }
    public void setZoneType(String zoneType) { this.zoneType = zoneType; }

    public List<Aisle> getAisles() { return aisles; }
    public void setAisles(List<Aisle> aisles) { this.aisles = aisles; }
}

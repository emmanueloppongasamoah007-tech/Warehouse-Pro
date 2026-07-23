package com.propro.warehouse.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "aisles")
public class Aisle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id", nullable = false)
    @JsonIgnore
    private Zone zone;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    private Orientation orientation = Orientation.VERTICAL;

    private int position;

    @Column(name = "start_pos")
    private int startPos;

    @Column(name = "end_pos")
    private int endPos;

    @Column(name = "is_cross_aisle")
    private boolean isCrossAisle = false;

    @OneToMany(mappedBy = "aisle", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BinLocation> bins = new ArrayList<>();

    public enum Orientation {
        HORIZONTAL, VERTICAL
    }

    // Constructors
    public Aisle() {}

    public Aisle(String name, Orientation orientation, int position, int startPos, int endPos) {
        this.name = name;
        this.orientation = orientation;
        this.position = position;
        this.startPos = startPos;
        this.endPos = endPos;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Zone getZone() { return zone; }
    public void setZone(Zone zone) { this.zone = zone; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Orientation getOrientation() { return orientation; }
    public void setOrientation(Orientation orientation) { this.orientation = orientation; }

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }

    public int getStartPos() { return startPos; }
    public void setStartPos(int startPos) { this.startPos = startPos; }

    public int getEndPos() { return endPos; }
    public void setEndPos(int endPos) { this.endPos = endPos; }

    public boolean isCrossAisle() { return isCrossAisle; }
    public void setCrossAisle(boolean crossAisle) { isCrossAisle = crossAisle; }

    public List<BinLocation> getBins() { return bins; }
    public void setBins(List<BinLocation> bins) { this.bins = bins; }
}

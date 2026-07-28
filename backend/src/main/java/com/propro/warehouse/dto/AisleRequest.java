package com.propro.warehouse.dto;

public class AisleRequest {
    private String name;
    private String orientation;
    private int position;
    private int startPos;
    private int endPos;
    private Long zoneId;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getOrientation() { return orientation; }
    public void setOrientation(String orientation) { this.orientation = orientation; }

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }

    public int getStartPos() { return startPos; }
    public void setStartPos(int startPos) { this.startPos = startPos; }

    public int getEndPos() { return endPos; }
    public void setEndPos(int endPos) { this.endPos = endPos; }

    public Long getZoneId() { return zoneId; }
    public void setZoneId(Long zoneId) { this.zoneId = zoneId; }
}

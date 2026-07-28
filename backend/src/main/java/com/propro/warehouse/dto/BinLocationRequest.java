package com.propro.warehouse.dto;

public class BinLocationRequest {
    private String code;
    private double x;
    private double y;
    private String sku;
    private Long aisleId;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public double getX() { return x; }
    public void setX(double x) { this.x = x; }

    public double getY() { return y; }
    public void setY(double y) { this.y = y; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public Long getAisleId() { return aisleId; }
    public void setAisleId(Long aisleId) { this.aisleId = aisleId; }
}

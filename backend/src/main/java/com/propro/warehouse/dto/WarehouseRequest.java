package com.propro.warehouse.dto;

public class WarehouseRequest {

    private String name;
    private double width;
    private double height;

    public WarehouseRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getWidth() { return width; }
    public void setWidth(double width) { this.width = width; }

    public double getHeight() { return height; }
    public void setHeight(double height) { this.height = height; }
}

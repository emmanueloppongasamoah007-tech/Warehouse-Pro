package com.propro.warehouse.dto;

import java.util.List;

public class OrderRequest {

    // Bin code of the packing/starting station
    private String startCode;

    // List of bin codes to pick, in the order they were added
    private List<String> pickListCodes;

    public OrderRequest() {}

    public String getStartCode() { return startCode; }
    public void setStartCode(String startCode) { this.startCode = startCode; }

    public List<String> getPickListCodes() { return pickListCodes; }
    public void setPickListCodes(List<String> pickListCodes) { this.pickListCodes = pickListCodes; }
}

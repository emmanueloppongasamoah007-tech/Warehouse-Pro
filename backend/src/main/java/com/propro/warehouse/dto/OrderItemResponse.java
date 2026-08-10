package com.propro.warehouse.dto;

import com.propro.warehouse.model.OrderItem;

/**
 * One line of an order's pick list as the client sees it.
 *
 * The id is exposed because it is what PATCH /api/orders/{id}/items/{itemId}/pick
 * addresses - the client cannot confirm a pick without it.
 */
public class OrderItemResponse {

    private Long id;
    private String binCode;
    private int position;
    private boolean picked;

    public OrderItemResponse() {}

    public OrderItemResponse(OrderItem item) {
        this.id = item.getId();
        this.binCode = item.getBinCode();
        this.position = item.getPosition();
        this.picked = item.isPicked();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBinCode() { return binCode; }
    public void setBinCode(String binCode) { this.binCode = binCode; }

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }

    public boolean isPicked() { return picked; }
    public void setPicked(boolean picked) { this.picked = picked; }
}

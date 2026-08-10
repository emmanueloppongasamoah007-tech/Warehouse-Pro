package com.propro.warehouse.dto;

import com.propro.warehouse.model.Order;
import com.propro.warehouse.model.OrderItem;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Flattens an Order into the shape the client uses: pickListCodes is a plain
 * list of codes, not a list of OrderItem rows.
 *
 * Follows RouteHistoryResponse, which does the same for RouteHistoryStop.
 */
public class OrderResponse {

    private Long id;
    private String startCode;
    private List<String> pickListCodes;
    private List<OrderItemResponse> items;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    public OrderResponse() {}

    public OrderResponse(Order order) {
        this.id = order.getId();
        this.startCode = order.getStartCode();
        // Sorted defensively: @OrderBy covers reads from the DB, but an Order
        // built in memory (as in DataSeeder) holds whatever order it was given.
        List<OrderItem> ordered = order.getItems().stream()
                .sorted(Comparator.comparingInt(OrderItem::getPosition))
                .collect(Collectors.toList());
        // pickListCodes is kept alongside items so existing callers that only
        // need the codes keep working; items adds per-line id and picked state.
        this.pickListCodes = ordered.stream()
                .map(OrderItem::getBinCode)
                .collect(Collectors.toList());
        this.items = ordered.stream()
                .map(OrderItemResponse::new)
                .collect(Collectors.toList());
        this.status = order.getStatus();
        this.createdAt = order.getCreatedAt();
        // Null while pending. The dashboard uses this to derive pick duration.
        this.completedAt = order.getCompletedAt();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getStartCode() { return startCode; }
    public void setStartCode(String startCode) { this.startCode = startCode; }

    public List<String> getPickListCodes() { return pickListCodes; }
    public void setPickListCodes(List<String> pickListCodes) { this.pickListCodes = pickListCodes; }

    public List<OrderItemResponse> getItems() { return items; }
    public void setItems(List<OrderItemResponse> items) { this.items = items; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}

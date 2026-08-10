package com.propro.warehouse.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * A pick order: a start bin plus the bins to visit.
 *
 * The pick list is a child table (order_items) rather than a comma-separated
 * column, matching how RouteHistoryEntry already stores its ordered stops.
 */
@Entity
@Table(name = "orders")
public class Order {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_COMPLETED = "COMPLETED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Stored as the bin's code rather than a foreign key to BinLocation.
     *
     * RouteHistoryEntry joins to BinLocation instead, but that is a record of a
     * route that was actually walked, so its bins are known to exist. An order
     * is created from client input, and keeping the raw code lets the controller
     * validate and return a clear 400 rather than failing on a constraint. It
     * also matches the wire format the frontend already uses.
     */
    @Column(name = "start_code", nullable = false)
    private String startCode;

    @Column(nullable = false)
    private String status = STATUS_PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * When the order was marked COMPLETED. Null while it is still pending.
     *
     * Nullable rather than defaulted, so "not finished" and "finished at time T"
     * are distinguishable - a sentinel date would quietly skew any duration
     * averaged over it.
     */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // Ordered by position so the pick list always reads back in the order it
    // was submitted; without @OrderBy the row order is whatever the DB returns.
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<OrderItem> items = new ArrayList<>();

    public Order() {}

    public Order(String startCode, List<String> pickListCodes) {
        this.startCode = startCode;
        if (pickListCodes != null) {
            int position = 0;
            for (String code : pickListCodes) {
                addItem(new OrderItem(this, code, position++));
            }
        }
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public void addItem(OrderItem item) {
        item.setOrder(this);
        items.add(item);
    }

    /**
     * Marks the order complete, stamping the time on the first call only.
     *
     * Status and completedAt move together here so they cannot disagree, and
     * re-completing keeps the original timestamp - the PATCH endpoint is
     * idempotent, and a retry should not shift when the work actually finished.
     */
    public void markCompleted() {
        this.status = STATUS_COMPLETED;
        if (this.completedAt == null) {
            this.completedAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getStartCode() { return startCode; }
    public void setStartCode(String startCode) { this.startCode = startCode; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public List<OrderItem> getItems() { return items; }
    public void setItems(List<OrderItem> items) { this.items = items; }
}

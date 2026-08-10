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

/**
 * One line of an order's pick list: which bin, and where it sits in the list.
 *
 * Mirrors RouteHistoryStop, which stores ordered stops the same way.
 */
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // @JsonIgnore breaks the parent/child cycle that would otherwise make
    // Jackson recurse forever when serializing an Order.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnore
    private Order order;

    @Column(name = "bin_code", nullable = false)
    private String binCode;

    // Zero-based index within the order's pick list.
    @Column(nullable = false)
    private int position;

    // Set once the picker confirms this bin. Primitive boolean so it is false
    // rather than null for rows written before this column existed.
    @Column(nullable = false)
    private boolean picked = false;

    public OrderItem() {}

    public OrderItem(Order order, String binCode, int position) {
        this.order = order;
        this.binCode = binCode;
        this.position = position;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public String getBinCode() { return binCode; }
    public void setBinCode(String binCode) { this.binCode = binCode; }

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }

    public boolean isPicked() { return picked; }
    public void setPicked(boolean picked) { this.picked = picked; }
}

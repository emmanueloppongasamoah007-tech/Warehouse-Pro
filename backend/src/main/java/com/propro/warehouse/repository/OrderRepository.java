package com.propro.warehouse.repository;

import com.propro.warehouse.model.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // @EntityGraph fetches items in the same query. Without it the lazy
    // collection is loaded per order when the DTO reads it (an N+1), and for
    // findById the session may already be closed by then.
    @EntityGraph(attributePaths = {"items"})
    List<Order> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"items"})
    Optional<Order> findWithItemsById(Long id);
}

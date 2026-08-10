package com.propro.warehouse.controller;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.propro.warehouse.dto.OrderRequest;
import com.propro.warehouse.dto.OrderResponse;
import com.propro.warehouse.model.BinLocation;
import com.propro.warehouse.model.Order;
import com.propro.warehouse.model.OrderItem;
import com.propro.warehouse.repository.BinLocationRepository;
import com.propro.warehouse.repository.OrderRepository;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderRepository orderRepository;
    private final BinLocationRepository binLocationRepository;

    public OrderController(OrderRepository orderRepository,
                            BinLocationRepository binLocationRepository) {
        this.orderRepository = orderRepository;
        this.binLocationRepository = binLocationRepository;
    }

    /**
     * GET /api/orders
     * Newest first, matching /api/routes/history.
     */
    @GetMapping
    public ResponseEntity<List<OrderResponse>> list() {
        List<OrderResponse> orders = orderRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(OrderResponse::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(orders);
    }

    /**
     * GET /api/orders/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOne(@PathVariable Long id) {
        Order order = orderRepository.findWithItemsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Order not found: " + id));
        return ResponseEntity.ok(new OrderResponse(order));
    }

    /**
     * POST /api/orders
     * Body: { "startCode": "PACK-01", "pickListCodes": ["A1-B03", "A2-B01"] }
     *
     * Bin codes are validated up front, the same way /api/routes/optimize does
     * it, so a bad pick list fails here rather than when the route is built.
     */
    @PostMapping
    public ResponseEntity<OrderResponse> create(@RequestBody OrderRequest request) {
        if (request.getStartCode() == null || request.getStartCode().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startCode is required");
        }

        binLocationRepository.findByCode(request.getStartCode())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Unknown start bin: " + request.getStartCode()));

        List<String> pickListCodes = request.getPickListCodes() != null
                ? request.getPickListCodes()
                : List.of();
        if (pickListCodes.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "pickListCodes must contain at least one bin code");
        }

        List<BinLocation> pickList = binLocationRepository.findByCodeIn(pickListCodes);
        Set<String> foundCodes = pickList.stream()
                .map(BinLocation::getCode)
                .collect(Collectors.toSet());
        List<String> missingCodes = pickListCodes.stream()
                .filter(code -> !foundCodes.contains(code))
                .distinct()
                .collect(Collectors.toList());
        if (!missingCodes.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unknown pick bin codes: " + missingCodes);
        }

        Order saved = orderRepository.save(new Order(request.getStartCode(), pickListCodes));
        return ResponseEntity.status(HttpStatus.CREATED).body(new OrderResponse(saved));
    }

    /**
     * PATCH /api/orders/{id}/complete
     * Marks the order COMPLETED and returns it.
     *
     * Idempotent: completing an already-completed order is a no-op rather than
     * an error, so a retried request from a flaky connection still succeeds.
     */
    @PatchMapping("/{id}/complete")
    public ResponseEntity<OrderResponse> complete(@PathVariable Long id) {
        Order order = orderRepository.findWithItemsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Order not found: " + id));

        // markCompleted stamps completedAt on the first call and leaves it alone
        // afterwards, so a retried request does not move the finish time.
        order.markCompleted();
        return ResponseEntity.ok(new OrderResponse(orderRepository.save(order)));
    }

    /**
     * PATCH /api/orders/{id}/items/{itemId}/pick
     * Marks one pick-list line as picked and returns the whole order, so the
     * client can refresh progress from a single response.
     *
     * Also idempotent - re-picking an already-picked item succeeds unchanged.
     */
    @PatchMapping("/{id}/items/{itemId}/pick")
    public ResponseEntity<OrderResponse> pickItem(@PathVariable Long id,
                                                   @PathVariable Long itemId) {
        Order order = orderRepository.findWithItemsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Order not found: " + id));

        // Matched within the order's own items rather than by a global item
        // lookup, so an itemId belonging to a different order is a 404 here
        // instead of silently mutating an unrelated order's line.
        OrderItem item = order.getItems().stream()
                .filter(candidate -> candidate.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Item " + itemId + " not found on order " + id));

        item.setPicked(true);
        return ResponseEntity.ok(new OrderResponse(orderRepository.save(order)));
    }
}

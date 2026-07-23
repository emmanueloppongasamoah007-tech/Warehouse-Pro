package com.propro.warehouse.service;

import com.propro.warehouse.model.BinLocation;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Core routing engine.
 *
 * Two responsibilities:
 *  1. Shortest path between two bins (Dijkstra over a weighted graph of bins).
 *  2. Full pick-route optimization for a list of bins (TSP), solved with a
 *     nearest-neighbor heuristic followed by 2-opt local search.
 *
 * NOTE: this version treats the warehouse as a complete graph with Euclidean
 * distance as edge weight (straight-line distance between bin coordinates).
 * Once aisle-constrained movement is modeled (i.e. you can only travel along
 * aisles, not diagonally through shelving), swap buildGraph() to only connect
 * bins that share an aisle or a cross-aisle, and Dijkstra will route around
 * obstacles automatically - the TSP layer above it doesn't need to change.
 */
@Service
public class PathfindingService {

    /** Straight-line distance between two bins. */
    public double distance(BinLocation a, BinLocation b) {
        double dx = a.getX() - b.getX();
        double dy = a.getY() - b.getY();
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Dijkstra shortest path between two bins over the given candidate set.
     * Returns the ordered path of bins from start to end (inclusive).
     */
    public List<BinLocation> shortestPath(BinLocation start, BinLocation end, List<BinLocation> allBins) {
        Map<Long, Double> dist = new HashMap<>();
        Map<Long, BinLocation> prev = new HashMap<>();
        Map<Long, BinLocation> byId = new HashMap<>();
        for (BinLocation b : allBins) {
            byId.put(b.getId(), b);
            dist.put(b.getId(), Double.MAX_VALUE);
        }
        dist.put(start.getId(), 0.0);

        PriorityQueue<Map.Entry<Long, Double>> pq =
                new PriorityQueue<>(Comparator.comparingDouble(Map.Entry::getValue));
        pq.add(Map.entry(start.getId(), 0.0));

        Set<Long> visited = new HashSet<>();

        while (!pq.isEmpty()) {
            Map.Entry<Long, Double> current = pq.poll();
            Long currentId = current.getKey();
            if (visited.contains(currentId)) continue;
            visited.add(currentId);

            if (currentId.equals(end.getId())) break;

            BinLocation currentBin = byId.get(currentId);
            for (BinLocation neighbor : allBins) {
                if (neighbor.getId().equals(currentId) || visited.contains(neighbor.getId())) continue;
                double weight = distance(currentBin, neighbor);
                double newDist = dist.get(currentId) + weight;
                if (newDist < dist.get(neighbor.getId())) {
                    dist.put(neighbor.getId(), newDist);
                    prev.put(neighbor.getId(), currentBin);
                    pq.add(Map.entry(neighbor.getId(), newDist));
                }
            }
        }

        // Reconstruct path
        LinkedList<BinLocation> path = new LinkedList<>();
        BinLocation step = end;
        path.addFirst(step);
        while (prev.containsKey(step.getId())) {
            step = prev.get(step.getId());
            path.addFirst(step);
        }

        if (path.getFirst().getId().equals(start.getId())) {
            return path;
        }
        return Collections.emptyList(); // no path found
    }

    /**
     * Solves the picking route: visit every bin in pickList exactly once,
     * starting from 'start', minimizing total travel distance.
     *
     * Strategy: nearest-neighbor construction, then 2-opt improvement.
     * Good enough for pick lists in the tens-of-items range typical of a
     * single order; swap for a proper solver (e.g. OR-Tools) if pick lists
     * grow large.
     */
    public List<BinLocation> solvePickRoute(BinLocation start, List<BinLocation> pickList) {
        if (pickList.isEmpty()) return List.of(start);

        List<BinLocation> route = nearestNeighborRoute(start, pickList);
        route = twoOptImprove(route);
        return route;
    }

    private List<BinLocation> nearestNeighborRoute(BinLocation start, List<BinLocation> pickList) {
        List<BinLocation> remaining = new ArrayList<>(pickList);
        List<BinLocation> route = new ArrayList<>();
        route.add(start);

        BinLocation current = start;
        while (!remaining.isEmpty()) {
            BinLocation nearest = null;
            double bestDist = Double.MAX_VALUE;
            for (BinLocation candidate : remaining) {
                double d = distance(current, candidate);
                if (d < bestDist) {
                    bestDist = d;
                    nearest = candidate;
                }
            }
            route.add(nearest);
            remaining.remove(nearest);
            current = nearest;
        }
        return route;
    }

    /** Classic 2-opt: repeatedly reverse segments if it shortens the total route. */
    private List<BinLocation> twoOptImprove(List<BinLocation> route) {
        boolean improved = true;
        List<BinLocation> best = new ArrayList<>(route);

        while (improved) {
            improved = false;
            for (int i = 1; i < best.size() - 1; i++) {
                for (int j = i + 1; j < best.size(); j++) {
                    List<BinLocation> candidate = twoOptSwap(best, i, j);
                    if (totalDistance(candidate) < totalDistance(best)) {
                        best = candidate;
                        improved = true;
                    }
                }
            }
        }
        return best;
    }

    private List<BinLocation> twoOptSwap(List<BinLocation> route, int i, int j) {
        List<BinLocation> newRoute = new ArrayList<>(route.subList(0, i));
        List<BinLocation> reversed = new ArrayList<>(route.subList(i, j + 1));
        Collections.reverse(reversed);
        newRoute.addAll(reversed);
        newRoute.addAll(route.subList(j + 1, route.size()));
        return newRoute;
    }

    public double totalDistance(List<BinLocation> route) {
        double total = 0.0;
        for (int i = 0; i < route.size() - 1; i++) {
            total += distance(route.get(i), route.get(i + 1));
        }
        return total;
    }
}

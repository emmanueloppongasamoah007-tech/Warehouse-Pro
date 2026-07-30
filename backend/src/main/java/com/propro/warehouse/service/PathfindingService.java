package com.propro.warehouse.service;

import com.propro.warehouse.model.Aisle;
import com.propro.warehouse.model.BinLocation;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class PathfindingService {

    private record Edge(String to, double weight) {}

    private double euclidean(double x1, double y1, double x2, double y2) {
        double dx = x1 - x2, dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private String binKey(Long id) { return "bin:" + id; }
    private String mouthKey(Long aisleId, boolean top) { return "mouth:" + aisleId + ":" + (top ? "top" : "bottom"); }

    private Map<String, List<Edge>> buildGraph(List<Aisle> aisles, List<BinLocation> allBins,
                                                Map<String, double[]> nodeCoords) {
        Map<String, List<Edge>> graph = new HashMap<>();
        Map<Long, List<BinLocation>> binsByAisle = new HashMap<>();
        List<BinLocation> unassigned = new ArrayList<>();

        for (BinLocation b : allBins) {
            if (b.getAisle() != null) {
                binsByAisle.computeIfAbsent(b.getAisle().getId(), k -> new ArrayList<>()).add(b);
            } else {
                unassigned.add(b);
            }
        }

        for (Aisle aisle : aisles) {
            List<BinLocation> bins = binsByAisle.getOrDefault(aisle.getId(), new ArrayList<>());
            boolean vertical = aisle.getOrientation() == Aisle.Orientation.VERTICAL;
            bins.sort(Comparator.comparingDouble(vertical ? BinLocation::getY : BinLocation::getX));

            for (BinLocation b : bins) nodeCoords.put(binKey(b.getId()), new double[]{b.getX(), b.getY()});

            for (int i = 0; i < bins.size() - 1; i++) {
                BinLocation a = bins.get(i), c = bins.get(i + 1);
                double w = euclidean(a.getX(), a.getY(), c.getX(), c.getY());
                addEdge(graph, binKey(a.getId()), binKey(c.getId()), w);
            }

            double aisleAxisCoord = bins.isEmpty() ? aisle.getPosition() : (vertical ? bins.get(0).getX() : bins.get(0).getY());

            double topX = vertical ? aisleAxisCoord : aisle.getStartPos();
            double topY = vertical ? aisle.getStartPos() : aisleAxisCoord;
            double botX = vertical ? aisleAxisCoord : aisle.getEndPos();
            double botY = vertical ? aisle.getEndPos() : aisleAxisCoord;

            String topKey = mouthKey(aisle.getId(), true);
            String botKey = mouthKey(aisle.getId(), false);
            nodeCoords.put(topKey, new double[]{topX, topY});
            nodeCoords.put(botKey, new double[]{botX, botY});

            if (!bins.isEmpty()) {
                BinLocation first = bins.get(0), last = bins.get(bins.size() - 1);
                addEdge(graph, topKey, binKey(first.getId()), euclidean(topX, topY, first.getX(), first.getY()));
                addEdge(graph, botKey, binKey(last.getId()), euclidean(botX, botY, last.getX(), last.getY()));
            } else {
                addEdge(graph, topKey, botKey, euclidean(topX, topY, botX, botY));
            }
        }

        chainCorridor(graph, nodeCoords, aisles, true);
        chainCorridor(graph, nodeCoords, aisles, false);

        for (BinLocation u : unassigned) {
            nodeCoords.put(binKey(u.getId()), new double[]{u.getX(), u.getY()});
            String nearestMouthKey = null;
            double bestDist = Double.MAX_VALUE;
            for (Aisle aisle : aisles) {
                for (boolean top : new boolean[]{true, false}) {
                    String mKey = mouthKey(aisle.getId(), top);
                    double[] mCoord = nodeCoords.get(mKey);
                    if (mCoord == null) continue;
                    double d = euclidean(u.getX(), u.getY(), mCoord[0], mCoord[1]);
                    if (d < bestDist) { bestDist = d; nearestMouthKey = mKey; }
                }
            }
            if (nearestMouthKey != null) addEdge(graph, binKey(u.getId()), nearestMouthKey, bestDist);
        }

        return graph;
    }

    private void chainCorridor(Map<String, List<Edge>> graph, Map<String, double[]> nodeCoords,
                                List<Aisle> aisles, boolean top) {
        List<Aisle> sorted = aisles.stream()
                .sorted(Comparator.comparingInt(Aisle::getPosition))
                .collect(Collectors.toList());
        for (int i = 0; i < sorted.size() - 1; i++) {
            String keyA = mouthKey(sorted.get(i).getId(), top);
            String keyB = mouthKey(sorted.get(i + 1).getId(), top);
            double[] a = nodeCoords.get(keyA), b = nodeCoords.get(keyB);
            if (a == null || b == null) continue;
            addEdge(graph, keyA, keyB, euclidean(a[0], a[1], b[0], b[1]));
        }
    }

    private void addEdge(Map<String, List<Edge>> graph, String a, String b, double weight) {
        graph.computeIfAbsent(a, k -> new ArrayList<>()).add(new Edge(b, weight));
        graph.computeIfAbsent(b, k -> new ArrayList<>()).add(new Edge(a, weight));
    }

    private Map<String, Double> dijkstra(String source, Map<String, List<Edge>> graph) {
        Map<String, Double> dist = new HashMap<>();
        PriorityQueue<Map.Entry<String, Double>> pq = new PriorityQueue<>(Map.Entry.comparingByValue());
        dist.put(source, 0.0);
        pq.add(Map.entry(source, 0.0));
        Set<String> visited = new HashSet<>();

        while (!pq.isEmpty()) {
            Map.Entry<String, Double> cur = pq.poll();
            if (!visited.add(cur.getKey())) continue;
            for (Edge e : graph.getOrDefault(cur.getKey(), List.of())) {
                double nd = cur.getValue() + e.weight();
                if (nd < dist.getOrDefault(e.to(), Double.MAX_VALUE)) {
                    dist.put(e.to(), nd);
                    pq.add(Map.entry(e.to(), nd));
                }
            }
        }
        return dist;
    }

    public List<BinLocation> solvePickRoute(BinLocation start, List<BinLocation> pickList,
                                             List<Aisle> allAisles, List<BinLocation> allBins) {
        if (pickList.isEmpty()) return List.of(start);

        Map<String, double[]> nodeCoords = new HashMap<>();
        Map<String, List<Edge>> graph = buildGraph(allAisles, allBins, nodeCoords);

        List<BinLocation> stops = new ArrayList<>();
        stops.add(start);
        stops.addAll(pickList);

        int n = stops.size();
        double[][] matrix = new double[n][n];
        for (int i = 0; i < n; i++) {
            Map<String, Double> distances = dijkstra(binKey(stops.get(i).getId()), graph);
            for (int j = 0; j < n; j++) {
                matrix[i][j] = distances.getOrDefault(binKey(stops.get(j).getId()), Double.MAX_VALUE / 2);
            }
        }

        List<Integer> order = nearestNeighborOrder(matrix, n);
        order = twoOptImprove(order, matrix);

        List<BinLocation> route = new ArrayList<>();
        for (int idx : order) route.add(stops.get(idx));
        return route;
    }

    private List<Integer> nearestNeighborOrder(double[][] matrix, int n) {
        List<Integer> remaining = new ArrayList<>();
        for (int i = 1; i < n; i++) remaining.add(i);
        List<Integer> order = new ArrayList<>();
        order.add(0);
        int current = 0;
        while (!remaining.isEmpty()) {
            int nearest = -1;
            double best = Double.MAX_VALUE;
            for (int cand : remaining) {
                if (matrix[current][cand] < best) { best = matrix[current][cand]; nearest = cand; }
            }
            order.add(nearest);
            remaining.remove((Integer) nearest);
            current = nearest;
        }
        return order;
    }

    private List<Integer> twoOptImprove(List<Integer> order, double[][] matrix) {
        boolean improved = true;
        List<Integer> best = new ArrayList<>(order);
        while (improved) {
            improved = false;
            for (int i = 1; i < best.size() - 1; i++) {
                for (int j = i + 1; j < best.size(); j++) {
                    List<Integer> candidate = new ArrayList<>(best.subList(0, i));
                    List<Integer> reversed = new ArrayList<>(best.subList(i, j + 1));
                    Collections.reverse(reversed);
                    candidate.addAll(reversed);
                    candidate.addAll(best.subList(j + 1, best.size()));
                    if (routeLength(candidate, matrix) < routeLength(best, matrix)) {
                        best = candidate;
                        improved = true;
                    }
                }
            }
        }
        return best;
    }

    private double routeLength(List<Integer> order, double[][] matrix) {
        double total = 0.0;
        for (int i = 0; i < order.size() - 1; i++) total += matrix[order.get(i)][order.get(i + 1)];
        return total;
    }

    public double totalDistance(List<BinLocation> route, List<Aisle> allAisles, List<BinLocation> allBins) {
        Map<String, double[]> nodeCoords = new HashMap<>();
        Map<String, List<Edge>> graph = buildGraph(allAisles, allBins, nodeCoords);
        double total = 0.0;
        for (int i = 0; i < route.size() - 1; i++) {
            Map<String, Double> distances = dijkstra(binKey(route.get(i).getId()), graph);
            double segmentDistance = distances.getOrDefault(binKey(route.get(i + 1).getId()), Double.MAX_VALUE / 2);
            if (segmentDistance >= Double.MAX_VALUE / 4) {
                throw new IllegalStateException("Unreachable route segment between "
                        + route.get(i).getCode() + " and " + route.get(i + 1).getCode());
            }
            total += segmentDistance;
        }
        return total;
    }
}

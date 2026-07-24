# WarehousePro

**BIT 268 Capstone — Group 73**
**Project 73: Optimal Warehouse Picking Route Algorithm**

A warehouse route optimization app: given a pick list of items across shelf
locations, compute the shortest route to collect them all and return to a
packing station. Picking-route optimization is a well-studied combinatorial
routing problem (a variant of the Traveling Salesman Problem), and this
project models it as a graph search + TSP problem.

## Approach

- **Graph model**: warehouse zones → aisles → bin locations, each bin
  positioned by (x, y) coordinates.
- **Shortest path**: Dijkstra between any two bins.
- **Full route optimization**: nearest-neighbor construction + 2-opt local
  search to minimize total pick-route distance across a multi-item order.
- Designed so the graph-building step can later be constrained to
  aisle-only movement (A* over a proper warehouse layout graph) without
  changing the TSP layer above it.

## Stack

- **Backend**: Java 17, Spring Boot 3, Spring Data JPA, H2 (dev) / PostgreSQL (prod)
- **Frontend**: Next.js / React (planned)

## Structure

```
WarehousePro/
├── backend/     # Spring Boot API + routing algorithm
└── frontend/    # Next.js UI (pick list input, route visualization)
```

## Running the backend locally

```bash
cd backend
./mvnw spring-boot:run
```

API will be available at `http://localhost:8080`.
H2 console (dev only): `http://localhost:8080/h2-console`

### Example: optimize a route

```
POST /api/routes/optimize
Content-Type: application/json

{
  "startCode": "PACK-01",
  "pickListCodes": ["A1-B03", "A2-B10", "A3-B01"]
}
```

Returns the optimized bin visiting order and total travel distance.

## Status

- [x] Core entities: `Zone`, `Aisle`, `BinLocation`
- [x] Dijkstra shortest-path service
- [x] Nearest-neighbor + 2-opt route solver
- [x] `/api/routes/optimize` endpoint
- [x] Seed data / sample warehouse layout
- [ ] Aisle-constrained graph edges (vs. current straight-line distance)
- [ ] Frontend: pick list input + route visualization
- [ ] Swap H2 → PostgreSQL for deployment

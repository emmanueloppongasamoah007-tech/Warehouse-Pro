# WarehousePro

**BIT 268 Capstone — Group 73**
**Project 73: Optimal Warehouse Picking Route Algorithm**

WarehousePro is a warehouse route optimization system that computes efficient picking routes through a simulated warehouse layout. The solution combines a graph-based pathfinding model with a route optimization layer inspired by the Traveling Salesman Problem (TSP) to minimize travel distance for warehouse workers.

## Project Goal

The project aims to improve warehouse productivity by generating optimized picking routes for employees based on a start location and a set of required bins.

## Core Idea

Given:
- a starting point (for example `PACK-01`), and
- a list of picking locations (for example `A1-B03`, `A2-B01`),

the system calculates:
- the best order to visit the bins, and
- the total distance travelled.

This makes the picking process more efficient, reduces unnecessary movement, and supports warehouse productivity analysis.

## Technical Approach

- **Warehouse model**: Zones, aisles, and bin locations are represented as JPA entities.
- **Routing model**: The system builds a walkable warehouse graph where movement respects aisle structure rather than cutting directly across shelves.
- **Shortest path**: Dijkstra is used to compute shortest paths between locations.
- **Route optimization**: A nearest-neighbor construction heuristic plus 2-opt local improvement is used to optimize the overall route.
- **Persistence**: The backend uses Spring Data JPA with PostgreSQL on Supabase.
- **Analytics**: Route optimization requests are stored and summarized through history and analytics endpoints.

## Stack

- **Backend**: Java 17, Spring Boot 3.3.4, Spring Data JPA, Maven
- **Database**: Supabase PostgreSQL
- **Frontend**: React Native (planned)

## Project Structure

```text
WarehousePro/
├── backend/        # Spring Boot API, routing algorithm, persistence
└── README.md       # Project overview and usage notes
```

## Backend Setup

Run the backend from the `backend` folder:

```bash
cd backend
mvn spring-boot:run
```

The API will be available at:
- `http://localhost:8080`

## API Endpoints

### Optimize a route

```http
POST /api/routes/optimize
Content-Type: application/json
```

Example body:

```json
{
  "startCode": "PACK-01",
  "pickListCodes": ["A1-B03", "A2-B01", "A3-B04", "A1-B01"]
}
```

Example response:

```json
{
  "orderedBinCodes": ["PACK-01", "A2-B01", "A1-B01", "A1-B03", "A3-B04"],
  "totalDistance": 105.0
}
```

### View route history

```http
GET /api/routes/history
```

### View analytics

```http
GET /api/routes/analytics
```

## Database Notes

The application is connected to Supabase PostgreSQL. The backend creates and uses the warehouse-related tables automatically through JPA.

## Current Status

- [x] Warehouse entities and repositories
- [x] Aisle-constrained routing algorithm
- [x] Route optimization endpoint
- [x] CRUD endpoints for zones, aisles, and bins
- [x] Supabase PostgreSQL integration
- [x] Route history and analytics endpoints
- [ ] React Native frontend

## Capstone Relevance

This project demonstrates:
- algorithmic thinking through graph search and route optimization,
- database design and persistence,
- REST API development,
- and practical warehouse productivity problem solving..

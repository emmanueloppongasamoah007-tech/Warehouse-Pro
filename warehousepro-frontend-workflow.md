# WarehousePro — React Native Frontend Build & Integration Workflow

Reference: existing Spring Boot backend at `http://localhost:8080`, endpoints
`POST /api/routes/optimize`, `GET /api/routes/history`, `GET /api/routes/analytics`.

---

## Step 0 — Prerequisites

- Node.js 18+ and npm/yarn installed
- Backend running locally (`cd backend && mvn spring-boot:run`) and reachable
- A phone with Expo Go installed, or an Android/iOS simulator

**Recommendation: use Expo**, not bare React Native. For a capstone timeline,
Expo removes Xcode/Android Studio setup friction, gives you camera/barcode
access out of the box (`expo-camera`, `expo-barcode-scanner`), and has a much
faster dev loop (hot reload over Wi-Fi via Expo Go). You can eject later if a
native module truly requires it — unlikely for this project.

---

## Step 1 — Initialize the project

```bash
npx create-expo-app@latest warehousepro-app -t expo-template-blank-typescript
cd warehousepro-app
npx expo install expo-router react-native-safe-area-context react-native-screens
```

Use `expo-router` (file-based routing) — it maps cleanly onto the screen list
you already have (login, picker home, route map, manager dashboard, etc.) and
avoids hand-wiring React Navigation stacks.

**Folder structure:**
```
app/
  (auth)/
    login.tsx
    forgot-password.tsx
  (picker)/
    home.tsx
    route-map.tsx
    pick-confirm.tsx
    order-complete.tsx
  (manager)/
    dashboard.tsx
    order-management.tsx
    analytics.tsx
  _layout.tsx
src/
  api/
    client.ts
    routes.ts
  store/
    useAuthStore.ts
    useOrderStore.ts
  types/
    index.ts
  components/
```

---

## Step 2 — Connect to the backend (the part most people get stuck on)

**Critical gotcha:** `localhost:8080` only works from a simulator running on
the *same machine* as the backend. A physical phone on Expo Go cannot reach
`localhost` — it needs your machine's LAN IP.

```bash
# find your machine's LAN IP
ipconfig getifaddr en0        # macOS
ipconfig                      # Windows, look for IPv4
```

Create `src/api/client.ts`:

```ts
import axios from "axios";

const BASE_URL = __DEV__
  ? "http://192.168.1.42:8080"   // your machine's LAN IP, phone + laptop on same Wi-Fi
  : "https://your-deployed-backend.com";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  // attach auth token here once auth exists (Step 5)
  return config;
});
```

Put `BASE_URL` behind an environment variable (`app.config.ts` + `expo-constants`)
rather than hardcoding it, so you're not editing code every time you switch
Wi-Fi networks or deploy.

---

## Step 3 — Type the API contracts from the README

`src/types/index.ts`:

```ts
export interface OptimizeRouteRequest {
  startCode: string;
  pickListCodes: string[];
}

export interface OptimizeRouteResponse {
  orderedBinCodes: string[];
  totalDistance: number;
}

export interface RouteHistoryEntry {
  id: string;
  startCode: string;
  pickListCodes: string[];
  orderedBinCodes: string[];
  totalDistance: number;
  createdAt: string;
}
```

`src/api/routes.ts`:

```ts
import { api } from "./client";
import { OptimizeRouteRequest, OptimizeRouteResponse, RouteHistoryEntry } from "../types";

export const optimizeRoute = (payload: OptimizeRouteRequest) =>
  api.post<OptimizeRouteResponse>("/api/routes/optimize", payload).then(r => r.data);

export const getRouteHistory = () =>
  api.get<RouteHistoryEntry[]>("/api/routes/history").then(r => r.data);

export const getRouteAnalytics = () =>
  api.get("/api/routes/analytics").then(r => r.data);
```

Wrap each call with React Query (`@tanstack/react-query`) instead of raw
`useEffect` + `useState` — it gives you loading/error states, caching, and
retry-on-reconnect for free, which matters a lot on a warehouse floor with
patchy Wi-Fi.

```bash
npx expo install @tanstack/react-query
```

---

## Step 4 — Build order (matches your earlier MVP priority list)

Build in this order so you always have something demoable:

1. **Picker home → route map** — call `optimizeRoute` with a hardcoded
   `startCode`/`pickListCodes`, render `orderedBinCodes` as a list. This
   proves the frontend-backend connection end to end before anything else.
2. **Pick confirmation → order complete** — local state only for now (no new
   backend endpoint needed yet).
3. **Manager dashboard** — call `getRouteHistory()` and `getRouteAnalytics()`,
   render as simple lists/cards before adding charts.
4. **Login screen** — see Step 5, since the backend has no auth yet.
5. **Order management, layout editor, settings** — everything else.

This order lets you validate the hardest integration point (the optimize
endpoint) on day one instead of building five screens before finding out the
request shape is wrong.

---

## Step 5 — Auth: the backend doesn't have it yet

Your README's current endpoints are all unauthenticated. Before the login
flow you designed can actually do anything, the backend needs:

- `POST /api/auth/login` → returns a JWT (Spring Security + `jjwt` or
  `spring-boot-starter-oauth2-resource-server`)
- `GET /api/auth/session` → validates a token, returns the role (picker/manager)
- A `Picker`/`User` JPA entity with a `role` field

**Two ways to sequence this:**

| Approach | When to use |
|---|---|
| Build auth on the backend now, then wire the login screen | If you have backend time this sprint — cleanest, matches the flow you already designed |
| Stub auth in the frontend (mock login, store a fake role in `useAuthStore`, skip real token calls) | If backend time is tight — lets you keep building picker/manager screens in parallel, swap in real calls later without touching UI |

Either way, keep the token in `expo-secure-store` (not `AsyncStorage` — it's
not encrypted) and attach it in the `client.ts` interceptor from Step 2.

```bash
npx expo install expo-secure-store
```

---

## Step 6 — State management

For a project this size, don't reach for Redux. Use:
- **Zustand** for client state (current user/role, active order, in-progress route)
- **React Query** for server state (history, analytics, anything from the API)

```bash
npm install zustand
```

Keep them separate — don't put API response data into Zustand and also cache
it in React Query; pick one source of truth per piece of data (server state →
React Query, everything else → Zustand).

---

## Step 7 — Test the full loop before adding more screens

Checklist before moving past the MVP:
- [ ] Phone (Expo Go) and laptop (Spring Boot) on the same Wi-Fi network
- [ ] `BASE_URL` points at LAN IP, not `localhost`
- [ ] `POST /api/routes/optimize` returns and renders on the route map screen
- [ ] `GET /api/routes/history` renders on the manager dashboard
- [ ] Error state shows when the backend is stopped (kill `mvn spring-boot:run` and confirm the app doesn't crash)

That last one matters more than it sounds — it's your first real test of the
offline/error handling story you'll want for the Evaluation phase later.

---

## Step 8 — Deployment (later, not now)

- Backend: containerize with Docker, deploy to a small instance (Railway/Render/Fly.io are simpler than raw AWS for a capstone) or keep on Supabase-adjacent hosting
- Frontend: `eas build` (Expo Application Services) for a shareable APK/TestFlight build once the MVP loop works, so your team/instructor can install it on a real phone instead of watching a simulator demo

---

## Quick reference: what to build this week

1. Expo project + folder structure (Step 1)
2. `api/client.ts` + `api/routes.ts` pointed at your LAN IP (Steps 2–3)
3. Picker home screen calling `optimizeRoute` with a hardcoded pick list (Step 4.1)
4. Confirm the round trip works end to end before touching auth or the manager dashboard

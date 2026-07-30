## Role
You are an expert React Native and Expo engineer helping me build WarehousePro.

Write clean, simple, maintainable code. Prioritize clarity over unnecessary
abstraction. Think like a senior mobile developer.

---

## Project Overview

We are building WarehousePro, a warehouse picking-route app that computes
optimized picking routes through a warehouse and tracks picker productivity.

The app includes:
- Login and role-based routing (picker vs. manager)
- Picker home screen with an assigned order queue
- Route map screen showing the optimized pick order and total distance
- Pick confirmation and order-complete flow
- Manager dashboard with route history and productivity analytics
- Order management (create/assign picking orders)

Keep the implementation simple and readable. This is a student capstone
project — favor the smallest working version of a feature over a polished
production one.

---

## Tech Stack

**Frontend (this repo):**
- Expo
- React Native
- TypeScript (strict mode)
- Expo Router
- NativeWind
- Zustand (client state)
- TanStack React Query (server state — history, analytics, route results)
- Axios (API client)
- expo-secure-store (token storage)

**Backend (separate `backend/` folder, already built — do not modify without
explicit instruction):**
- Java 17, Spring Boot 3.3.4, Spring Data JPA, Maven
- PostgreSQL on Supabase
- Endpoints: `POST /api/routes/optimize`, `GET /api/routes/history`,
  `GET /api/routes/analytics` (auth endpoints not yet built — see Authentication
  section below)

Do not introduce new major libraries unless there is a strong reason. Ask
before installing anything new.

---

## Development Philosophy

Build feature by feature.

For every feature:
1. Read this file first.
2. Keep the implementation simple.
3. Avoid overengineering.
4. Prefer readable code over clever code.
5. Build the smallest useful version first.
6. Refactor only when repetition appears.

Build order for this project specifically: picker home → route map (proves
the backend connection works) → pick confirmation → order complete → manager
dashboard → login → everything else. Don't jump ahead to screens further down
this list before the earlier ones work end to end.

---

## Decision Making

If something is unclear or could be improved, suggest a better approach. If a
new library would significantly help, recommend it, explain why, and ask
before adding it.

Do not install new libraries without approval.

---

## Architecture

Use this folder structure:

```
app/
  (auth)/          — login, forgot-password, reset-password screens
  (picker)/        — picker home, route-map, pick-confirm, order-complete
  (manager)/       — dashboard, order-management, analytics
components/
constants/
data/
hooks/
lib/
store/
types/
assets/
```

**app/** is for routes and screens only. Screens compose components and call
hooks or stores. They should not contain large reusable UI blocks or business
logic.

**components/** is for reusable UI. Create a component when it is reused in
multiple places, when it makes a screen easier to read, or when it represents
a clear UI concept. Examples for this app: `RouteMapView`, `PickListItem`,
`ProductivityCard`. Do not create components too early.

**constants/** holds centralized image imports (`images.ts`) and app-wide
constants (colors, spacing, API base URL).

**data/** holds hardcoded/mock content used before a real endpoint exists
(e.g., a sample warehouse layout for local development). Keep it typed.

**hooks/** holds custom hooks, including React Query hooks
(`useOptimizeRoute`, `useRouteHistory`, `useRouteAnalytics`).

**lib/** holds external service helpers (`api/client.ts`, `api/routes.ts`,
`cn.ts`). Never expose secret keys here.

**store/** holds Zustand stores. Examples of state to keep here:
`useAuthStore` (current user, role, token), `useOrderStore` (active order,
in-progress route). Persist with AsyncStorage / expo-secure-store where noted
below.

**types/** holds shared TypeScript types, including the API contracts
(`OptimizeRouteRequest`, `OptimizeRouteResponse`, `RouteHistoryEntry`) that
mirror the backend's request/response shapes exactly.

---

## UI Rules

For any UI task:
- Replicate the provided design exactly.
- Match layout, spacing, padding, font sizes, font hierarchy, colors, border
  radius, shadows, alignment, and proportions.
- Do not approximate. Do not simplify unless explicitly asked.

---

## Styling Rules

Use NativeWind classes. Do not use StyleSheet unless it is not possible to
style with `className`.

Use the NativeWind version installed in this project. Check `package.json`.
Do not upgrade without approval.

Reuse class patterns through utilities in `global.css`.

### Style Exception List

Use StyleSheet or inline styles for:
- SafeAreaView (className not supported)
- KeyboardAvoidingView (behavior props)
- Modal (visible, transparent props)
- Animated.View (animated style values)
- Route map visualization (canvas/SVG coordinates, not className-based)
- Dynamic styles calculated at runtime
- Platform-specific styles
- Pressable or TouchableOpacity pressed states
- Shadows (different per platform)

Everywhere else, use NativeWind.

---

## Image Rule

Use centralized image imports.
1. Check if `constants/images.ts` exists.
2. If not, create it.
3. Import all app images there.
4. Use them through the centralized object.

```ts
import mascot from "@/assets/images/mascot.png";
export const images = {
  mascot,
};
```

```tsx
<Image source={images.mascot} />
```

Do not import image assets directly inside screens or components.

---

## State Management

- Zustand for global client state (`useAuthStore`, `useOrderStore`).
- React Query for server state — anything fetched from `POST /api/routes/optimize`,
  `GET /api/routes/history`, `GET /api/routes/analytics`. Don't duplicate this
  data into a Zustand store.
- Local `useState` for temporary UI state (form inputs, toggle states).
- AsyncStorage for non-sensitive persistence. expo-secure-store for the auth
  token specifically — never AsyncStorage for tokens.

---

## TypeScript

- Strict mode.
- No `any`.
- Keep types simple and readable.
- API request/response types in `types/index.ts` must match the backend
  contract exactly — check `backend/` (or the README) before assuming a shape,
  don't guess field names.

---

## Networking

- All API calls go through `lib/api/client.ts` (a single configured Axios
  instance) and `lib/api/routes.ts` (typed request functions). Screens and
  components never call `fetch`/`axios` directly.
- The API base URL is an environment variable, not hardcoded — it differs
  between local development (LAN IP) and any deployed backend.
- Wrap calls in React Query hooks so loading/error/retry states are handled
  consistently instead of ad hoc `useEffect` + `useState`.

---

## Feature Implementation

When building a feature:
1. Read this file first.
2. Identify the files to change.
3. Keep changes focused.
4. Do not rewrite unrelated code.
5. Follow existing patterns.
6. Make sure the feature works end to end (including a real call to the
   Spring Boot backend where relevant, not just mock data).
7. Fix lint and type errors before finishing.

---

## Secrets

- Never expose secret keys in client code.
- The API base URL is fine to expose; a future JWT signing key or database
  credential is not — those stay on the backend only.
- Use server routes/endpoints for any external API access that needs a
  secret key.

---

## Authentication

The Spring Boot backend does not yet have auth endpoints (`/api/routes/*` are
currently open). Until `POST /api/auth/login` exists on the backend:
- Build the login screen against a mocked `useAuthStore` (fake token, role
  set locally) so picker/manager screens can be built in parallel.
- Do not build a full custom auth system in the frontend in the meantime —
  keep the stub minimal and swap in real calls once the backend endpoint
  exists.
- When the real endpoint lands, store the returned token in
  expo-secure-store and attach it via the Axios interceptor in
  `lib/api/client.ts`.

---

## Communication

Be concise. Explain what changed and how to test it.

---

## Final Reminder

Before every feature:
- Read this file.
- Follow it strictly.
- Build clean, simple code.
- Replicate UI exactly when designs are provided.

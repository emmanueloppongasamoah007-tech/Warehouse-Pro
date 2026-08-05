# Picker Home Screen — Technical Plan

Covers the two sub-interfaces on the Picker Home screen: the **Warehouse
Interface** (visual map of bins/aisles with the route drawn on it) and the
**Route Interface** (turn-by-turn list). Both are driven by the same
optimize-route response, so they're built as two views over one shared state,
not two separate data flows.

---

## 1. The gap you need to close first

The backend algorithm (Dijkstra for shortest paths + nearest-neighbor/2-opt
for bin ordering) returns:

```json
{
  "orderedBinCodes": ["PACK-01", "A2-B01", "A1-B01", "A1-B03", "A3-B04"],
  "totalDistance": 105.0
}
```

That's enough for the Route Interface (it's just an ordered list), but the
**Warehouse Interface can't draw anything from this alone** — it has no bin
coordinates and no leg-by-leg path (the actual aisle-respecting path Dijkstra
computed between each consecutive bin pair, not just the endpoints).

**Two ways to close this, pick one before building the Warehouse Interface:**

| Option | What it involves | When to use |
|---|---|---|
| **A. Extend the backend** (recommended) | Add `GET /api/warehouse/layout` returning zone/aisle/bin coordinates, and have `/api/routes/optimize` also return the per-leg path nodes Dijkstra actually walked (not just start/end bins) | If you have backend time this sprint — gives you an accurate map and lets "totalDistance" break down per leg for the productivity analytics later too |
| **B. Static client-side layout** | Hardcode a `data/warehouseLayout.ts` mapping bin codes → grid `{x, y}` coordinates, matching your test warehouse. Draw straight lines between consecutive bins in `orderedBinCodes` — it won't respect aisle walls but is visually reasonable | If backend time is tight — unblocks frontend work immediately, swap in Option A later without changing component structure |

The rest of this plan works with either option — the difference is just
where the coordinate data comes from (`useWarehouseLayout()` hook wraps
either the API call or the static import).

---

## 2. Component breakdown

```
app/(picker)/home.tsx                 — order queue list
app/(picker)/route-map.tsx            — the screen this plan covers

components/
  warehouse/
    WarehouseInterface.tsx            — SVG/Canvas map, owns pan/zoom
    WarehouseBin.tsx                  — single bin marker (picked/unpicked/current)
    WarehousePathOverlay.tsx          — draws the route line over the map
  route/
    RouteInterface.tsx                — scrollable turn-by-turn list
    RouteStep.tsx                     — single step row (bin code, distance, status)
    RouteProgressHeader.tsx           — "3 of 5 picked · 62m remaining"

hooks/
  useOptimizeRoute.ts                 — React Query mutation, calls POST /api/routes/optimize
  useWarehouseLayout.ts               — fetches or imports bin coordinates
  useRouteProgress.ts                 — derives current step, remaining distance from store

store/
  useOrderStore.ts                    — active order, orderedBinCodes, pickedBins (Set), currentStepIndex

types/
  route.ts                            — OptimizeRouteResponse, WarehouseLayout, RouteStep
```

**Why split Warehouse and Route into separate components instead of one big
screen file:** they render completely differently (spatial vs. list) but
read from the same store, so keeping them independent means you can test,
tweak, or even toggle between them (map view / list view) without touching
the other.

---

## 3. Shared state shape

```ts
// store/useOrderStore.ts
interface OrderState {
  activeOrder: {
    startCode: string;
    pickListCodes: string[];
  } | null;
  orderedBinCodes: string[];       // from the optimize response, in visit order
  totalDistance: number;
  pickedBins: Set<string>;         // bin codes the picker has confirmed
  currentStepIndex: number;        // derived: first unpicked index in orderedBinCodes

  startOrder: (order: ActiveOrder) => void;
  confirmPick: (binCode: string) => void;
  resetOrder: () => void;
}
```

`currentStepIndex` is what both interfaces highlight — the Warehouse
Interface highlights that bin on the map, the Route Interface highlights
that row in the list. One source of truth, two renderings.

---

## 4. Warehouse Interface — build steps

1. **Render the static layout first, no route.** Pull bin coordinates from
   `useWarehouseLayout()` and draw them as dots/rects on an SVG canvas (or
   `react-native-svg`). Verify every bin code in a test pick list actually
   has a coordinate before going further — a missing coordinate is a silent
   bug that just doesn't draw anything.
2. **Draw the path.** For each consecutive pair in `orderedBinCodes`, draw a
   line segment between their coordinates (Option B) or the actual Dijkstra
   path nodes (Option A). Order matters — this is literally the algorithm's
   output, don't re-sort it client-side.
3. **Style by pick state.** Bin not yet reached: neutral. Current target
   (`orderedBinCodes[currentStepIndex]`): highlighted/pulsing. Already
   picked: checked/dimmed. This is a pure function of `pickedBins` +
   `currentStepIndex` — no separate "highlight state" needed.
4. **Add pan/zoom** only after the static + path rendering both work.
   `react-native-svg` + a simple gesture handler is enough; don't reach for
   a full mapping library for a grid-based warehouse.
5. **Tap-to-confirm (optional):** tapping the current bin's marker on the
   map calls `confirmPick(binCode)` — same action the Route Interface's
   button triggers, so keep that logic in the store, not duplicated in both
   components.

---

## 5. Route Interface — build steps

1. **Render `orderedBinCodes` as a plain list first**, no styling — confirm
   the order matches what the API returned before adding any visual polish.
2. **Add per-row state**: picked (checkmark), current (highlighted, shows a
   "Confirm pick" button), upcoming (dimmed, no action).
3. **Progress header**: `${pickedBins.size} of ${orderedBinCodes.length}
   picked`. Remaining distance is a nice-to-have — only computable precisely
   if you went with Option A (per-leg distances); with Option B, just show
   total distance and skip "remaining."
4. **Confirm action**: button on the current row calls
   `confirmPick(binCode)`, which advances `currentStepIndex` and — once
   `pickedBins.size === orderedBinCodes.length` — navigates to the
   order-complete screen.

---

## 6. Wiring it together in `route-map.tsx`

```tsx
export default function RouteMapScreen() {
  const { activeOrder } = useOrderStore();
  const { mutate: optimize, data, isPending, error } = useOptimizeRoute();

  useEffect(() => {
    if (activeOrder) optimize(activeOrder);
  }, [activeOrder]);

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => optimize(activeOrder!)} />;
  if (!data) return null;

  return (
    <View className="flex-1">
      <WarehouseInterface orderedBinCodes={data.orderedBinCodes} />
      <RouteInterface orderedBinCodes={data.orderedBinCodes} totalDistance={data.totalDistance} />
    </View>
  );
}
```

Keep the two interfaces stacked (map on top, list below, or a toggle between
them) rather than trying to merge them into one component — they're
consuming the same data but serve different moments (map for orientation,
list for the actual picking motion).

---

## 7. Suggested build order (ties back to your MVP priority list)

1. `useOptimizeRoute` hook + confirm it returns real data from the backend
2. Route Interface as a plain list (no map yet) — this alone is a usable MVP
3. Static warehouse layout data (Option B) for your test warehouse
4. Warehouse Interface: dots + path line, no interactivity
5. Wire pick confirmation into the shared store, verify both interfaces
   update together
6. Only then: pan/zoom, tap-to-confirm on the map, animations

Steps 1–2 alone give you something demoable end to end. Don't start the
Warehouse Interface until that's solid — it's the higher-effort, higher-risk
piece and shouldn't block having a working app.

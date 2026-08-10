import { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

/** GET /api/bins - BinLocation. `aisle` is @JsonIgnore'd on the model. */
export type Bin = {
  id: number;
  code: string;
  x: number;
  y: number;
  sku: string | null;
};

/** GET /api/aisles - Aisle, with its bins nested. `zone` is @JsonIgnore'd. */
export type Aisle = {
  id: number;
  name: string;
  orientation: 'VERTICAL' | 'HORIZONTAL';
  position: number;
  startPos: number;
  endPos: number;
  bins: Bin[];
};

type WarehouseMapProps = {
  aisles: Aisle[];
  bins: Bin[];
  /** Route order from the optimizer, start bin first. */
  routeCodes: string[];
  /**
   * Bin codes already picked, drawn green instead of orange.
   *
   * Optional: the read-only fallback route has no order behind it and so has
   * no picked state to show.
   */
  pickedCodes?: string[];
  /**
   * Warehouse floor size, in the same units as bin x/y.
   *
   * When given, the map draws that floor and places bins within it, so
   * resizing the warehouse visibly changes the plan. Without it the map falls
   * back to fitting the bins themselves, which is right for the picking route
   * where the floor edges do not matter.
   */
  floor?: { width: number; height: number };
};

const EDGE_PADDING = 30;
const AISLE_PAD = 11;
const MIN_HEIGHT = 220;
const MAX_HEIGHT = 460;

const START_FILL = '#0f172a'; // slate-900
const PICKED_FILL = '#10b981'; // emerald-500
const PENDING_FILL = '#f97316'; // orange-500

function extent(values: number[]) {
  return { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * Top-down warehouse map, derived entirely from the coordinates the backend
 * returns. Nothing about the number of aisles, bins, or their spacing is
 * assumed, so an admin adding a zone or aisle shows up here with no code change.
 *
 * Aisle bands are derived from each aisle's own bins rather than from its
 * `position`/`startPos`/`endPos` fields: in the seeded data those are ordinals
 * (aisle 1, 2, 3) while the bins they contain sit at x = 10, 20, 30, so the two
 * are not in the same units. Measuring the bins keeps the bands aligned with the
 * markers whatever `position` happens to mean.
 */
export function WarehouseMap({
  aisles,
  bins,
  routeCodes,
  pickedCodes,
  floor,
}: WarehouseMapProps) {
  const [width, setWidth] = useState(0);

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  if (bins.length === 0 && !floor) {
    return (
      <View className="items-center rounded-2xl border border-slate-200 bg-white p-8">
        <Text className="text-sm text-slate-500">No bin locations configured yet.</Text>
      </View>
    );
  }

  // With a floor, the drawn area is the warehouse itself, anchored at the
  // origin - so changing width or height changes the plan even when the bins
  // stay put. Without one, the extent is derived from the bins.
  //
  // The bins are folded in either way. A bin outside the floor is bad data, but
  // it must still be drawn inside the frame: clamping the extent to the floor
  // would give it a negative coordinate and render it outside the SVG, which
  // looks like the whole map has broken rather than one bin being misplaced.
  const binXs = bins.map((bin) => bin.x);
  const binYs = bins.map((bin) => bin.y);
  const xs = floor
    ? { min: Math.min(0, ...binXs), max: Math.max(floor.width, ...binXs) }
    : extent(binXs);
  const ys = floor
    ? { min: Math.min(0, ...binYs), max: Math.max(floor.height, ...binYs) }
    : extent(binYs);
  // A single bin, or a layout that is a straight line, gives a zero span and
  // would divide by zero below.
  const spanX = xs.max - xs.min || 1;
  const spanY = ys.max - ys.min || 1;

  const height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, width * (spanY / spanX)));

  const usableW = Math.max(1, width - EDGE_PADDING * 2);
  const usableH = Math.max(1, height - EDGE_PADDING * 2);
  // One scale for both axes, so the floor plan keeps its real proportions.
  const scale = Math.min(usableW / spanX, usableH / spanY);
  const offsetX = EDGE_PADDING + (usableW - spanX * scale) / 2;
  const offsetY = EDGE_PADDING + (usableH - spanY * scale) / 2;

  const px = (x: number) => offsetX + (x - xs.min) * scale;
  // Flipped: warehouse y grows away from the packing station, SVG y grows down.
  const py = (y: number) => offsetY + (ys.max - y) * scale;

  // Aisle bands are padded outward, and a band on the outermost row would push
  // that padding past the edge. EDGE_PADDING is the room available, so clamping
  // to it keeps the band inside the frame without shifting the markers.
  const clampX = (value: number) => Math.min(Math.max(value, 1), Math.max(1, width - 1));
  const clampY = (value: number) => Math.min(Math.max(value, 1), Math.max(1, height - 1));

  const binByCode = new Map(bins.map((bin) => [bin.code, bin]));
  const stops = routeCodes
    .map((code) => binByCode.get(code))
    .filter((bin): bin is Bin => Boolean(bin));

  // Set rather than Array.includes: this is checked once per marker.
  const picked = new Set(pickedCodes ?? []);

  return (
    <View
      onLayout={handleLayout}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Width comes from onLayout, so the first pass reserves height only.
          react-native-svg is not in NativeWind's interop registry - its
          geometry and colors are props, never className. */}
      {width > 0 ? (
        <Svg width={width} height={height}>
          {/* Floor boundary, drawn first so everything else sits on top of it.
              This is what makes a resize visible: the outline moves even when
              the bins do not. */}
          {floor ? (
            <Rect
              x={px(0)}
              y={py(floor.height)}
              width={floor.width * scale}
              height={floor.height * scale}
              rx={6}
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
          ) : null}

          {aisles.map((aisle) => {
            if (aisle.bins.length === 0) return null;
            const ax = extent(aisle.bins.map((bin) => bin.x));
            const ay = extent(aisle.bins.map((bin) => bin.y));
            const left = clampX(px(ax.min) - AISLE_PAD);
            const right = clampX(px(ax.max) + AISLE_PAD);
            const top = clampY(py(ay.max) - AISLE_PAD);
            const bottom = clampY(py(ay.min) + AISLE_PAD);
            return (
              <G key={aisle.id}>
                <Rect
                  x={left}
                  y={top}
                  width={Math.max(1, right - left)}
                  height={Math.max(1, bottom - top)}
                  rx={10}
                  fill="#f1f5f9"
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <SvgText
                  x={(px(ax.min) + px(ax.max)) / 2}
                  y={Math.max(9, top - 7)}
                  fontSize={10}
                  fontWeight="600"
                  fill="#94a3b8"
                  textAnchor="middle">
                  {aisle.name}
                </SvgText>
              </G>
            );
          })}

          {/* Every bin, so unpicked locations still read as part of the floor. */}
          {bins.map((bin) => (
            <Circle key={bin.id} cx={px(bin.x)} cy={py(bin.y)} r={3} fill="#cbd5e1" />
          ))}

          {/* Legs between consecutive stops, in route order. */}
          {stops.slice(1).map((stop, index) => (
            <Line
              key={`leg-${index}`}
              x1={px(stops[index].x)}
              y1={py(stops[index].y)}
              x2={px(stop.x)}
              y2={py(stop.y)}
              stroke="#fb923c"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
          ))}

          {stops.map((stop, index) => (
            <G key={`stop-${index}-${stop.code}`}>
              <Circle
                cx={px(stop.x)}
                cy={py(stop.y)}
                r={13}
                // Start first: the packing station is not a pick, so it stays
                // dark even if its code somehow appears in pickedCodes.
                fill={
                  index === 0 ? START_FILL : picked.has(stop.code) ? PICKED_FILL : PENDING_FILL
                }
              />
              <SvgText
                x={px(stop.x)}
                y={py(stop.y) + 4}
                fontSize={11}
                fontWeight="700"
                fill="#ffffff"
                textAnchor="middle">
                {index === 0 ? 'S' : String(index)}
              </SvgText>
              <SvgText
                x={px(stop.x)}
                y={py(stop.y) + 27}
                fontSize={9}
                fill="#475569"
                textAnchor="middle">
                {stop.code}
              </SvgText>
            </G>
          ))}
        </Svg>
      ) : (
        <View style={{ height: MIN_HEIGHT }} />
      )}
    </View>
  );
}

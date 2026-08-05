import { useMemo } from "react";
import { Text, View } from "react-native";
import {
  getWarehouseCoordinate,
  mapSize,
  warehouseAisles,
  warehouseRows,
  rowPositions,
} from "@/data/warehouseLayout";

interface WarehouseMapProps {
  orderedBinCodes: string[];
  pickedBins: Set<string>;
  currentBinCode: string | null;
}

interface PathSegment {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export function WarehouseMap({
  orderedBinCodes,
  pickedBins,
  currentBinCode,
}: WarehouseMapProps) {
  const points = useMemo(
    () =>
      orderedBinCodes
        .map((code) => ({
          code,
          position: getWarehouseCoordinate(code),
        }))
        .filter((item) => item.position !== null) as {
        code: string;
        position: { x: number; y: number };
      }[],
    [orderedBinCodes]
  );

  const pathSegments = useMemo(() => {
    const segments: PathSegment[] = [];
    for (let index = 0; index + 1 < points.length; index += 1) {
      const from = points[index].position;
      const to = points[index + 1].position;

      if (from.x !== to.x) {
        segments.push({
          key: `${points[index].code}-${points[index + 1].code}-h`,
          top: from.y - 1,
          left: Math.min(from.x, to.x),
          width: Math.max(Math.abs(to.x - from.x), 2),
          height: 2,
        });
      }

      if (from.y !== to.y) {
        segments.push({
          key: `${points[index].code}-${points[index + 1].code}-v`,
          top: Math.min(from.y, to.y),
          left: to.x - 1,
          width: 2,
          height: Math.max(Math.abs(to.y - from.y), 2),
        });
      }
    }
    return segments;
  }, [points]);

  return (
    <View className="rounded-3xl bg-slate-100 p-4 shadow-sm shadow-slate-200/70">
      <Text className="mb-3 text-base font-semibold text-slate-900">
        Warehouse map
      </Text>
      <View
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white"
        style={{ width: mapSize.width, height: mapSize.height }}
      >
        <View className="absolute inset-0">
          <View className="absolute left-0 right-0 top-0 h-16 border-b border-slate-200" />

          {warehouseRows.map((row, index) => (
            <View key={row}>
              <View
                className="absolute left-0 right-0 h-px bg-slate-200"
                style={{ top: rowPositions[index] }}
              />
              <Text
                className="absolute text-[10px] font-semibold text-slate-400"
                style={{ left: 8, top: rowPositions[index] - 6 }}
              >
                {row}
              </Text>
            </View>
          ))}

          {warehouseAisles.map((aisle) => (
            <View
              key={aisle}
              className="absolute"
              style={{
                left: getWarehouseCoordinate(`${aisle}-B01`)?.x ?? 0,
                top: 0,
                width: 1,
                height: mapSize.height,
                backgroundColor: "#E2E8F0",
              }}
            />
          ))}

          {warehouseAisles.map((aisle, index) => (
            <Text
              key={`${aisle}-label`}
              className="absolute text-xs font-semibold text-slate-400"
              style={{ left: (getWarehouseCoordinate(`${aisle}-B01`)?.x ?? 0) - 10, top: 14 }}
            >
              {aisle}
            </Text>
          ))}

          {pathSegments.map((segment) => (
            <View
              key={segment.key}
              className="absolute rounded-full bg-cyan-500"
              style={segment}
            />
          ))}

          {points.map((point, index) => {
            const isStart = point.code === "PACK-01";
            const isPicked = pickedBins.has(point.code);
            const isCurrent = currentBinCode === point.code;
            const badgeBg = isStart
              ? "bg-slate-900"
              : isCurrent
              ? "bg-amber-400"
              : isPicked
              ? "bg-emerald-500"
              : "bg-slate-300";

            return (
              <View
                key={point.code}
                className="absolute items-center"
                style={{ left: point.position.x - 16, top: point.position.y - 16 }}
              >
                <View
                  className={`h-10 w-10 items-center justify-center rounded-full ${badgeBg}`}
                >
                  <Text className="text-[10px] font-bold text-white">
                    {isStart ? "S" : String(index)}
                  </Text>
                </View>
                <View className="mt-2 rounded-2xl bg-white px-2 py-1 shadow-sm shadow-slate-200/80">
                  <Text className="text-[11px] font-semibold text-slate-700">
                    {point.code}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
      <View className="mt-4 rounded-3xl bg-slate-50 p-3">
        <Text className="text-xs uppercase tracking-[0.24em] text-slate-400">
          Current location
        </Text>
        <Text className="mt-2 text-sm font-semibold text-slate-900">PACK-01</Text>
      </View>
    </View>
  );
}

export interface WarehouseCoordinate {
  x: number;
  y: number;
}

const aislePositions: Record<string, number> = {
  "A1": 55,
  "A2": 135,
  "A3": 215,
  "A4": 295,
};

const rowStartY = 40;
const rowSpacing = 32;

export const mapSize = {
  width: 340,
  height: 260,
};

export const warehouseAisles = ["A1", "A2", "A3", "A4"];
export const warehouseRows = ["B01", "B02", "B03", "B04", "B05", "B06", "B07"];
export const rowPositions = warehouseRows.map((_, index) => rowStartY + index * rowSpacing);

export function getWarehouseCoordinate(code: string): WarehouseCoordinate | null {
  if (code === "PACK-01") {
    return { x: 45, y: 205 };
  }

  const match = code.match(/^([A-Z][0-9]?)-B(\d{2})$/);
  if (!match) {
    return null;
  }

  const aisle = match[1];
  const binNumber = Number(match[2]);
  const x = aislePositions[aisle];
  const y = rowStartY + (binNumber - 1) * rowSpacing;

  if (typeof x !== "number" || Number.isNaN(y)) {
    return null;
  }

  return { x, y };
}

import type { Aisle, Bin } from '@/components/warehouse-map';

/**
 * Placement rules for new aisles and shelves.
 *
 * The admin types a name and a shelf count; coordinates are derived here rather
 * than typed by hand. Every value below is read from the existing layout where
 * possible, so a warehouse whose real spacing differs from the seeded sample
 * keeps its own spacing as it grows.
 */

/** Used only when the warehouse is empty and there is nothing to measure. */
const DEFAULT_AISLE_SPACING = 10;
const DEFAULT_SHELF_SPACING = 10;
const DEFAULT_FIRST_SHELF_Y = 5;

/** Gap between distinct values, ignoring repeats. Null when fewer than two. */
function medianGap(values: number[]): number | null {
  const unique = Array.from(new Set(values)).sort((a, b) => a - b);
  if (unique.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < unique.length; i += 1) gaps.push(unique[i] - unique[i - 1]);
  gaps.sort((a, b) => a - b);
  // Median, not mean: one unusually placed aisle should not skew the spacing.
  return gaps[Math.floor(gaps.length / 2)];
}

/**
 * Where the next aisle goes, and how its shelves are spaced.
 *
 * Measured from the current layout: a warehouse with aisles at x = 10, 20, 30
 * puts the next at 40. One using 2.5m spacing puts the next 2.5 further along.
 * The packing station is excluded - it is a fixed point, not part of the grid.
 */
export function nextAislePlacement(aisles: Aisle[], bins: Bin[], startCode: string) {
  const aisleBins = bins.filter((bin) => bin.code !== startCode);

  const xs = aisleBins.map((bin) => bin.x);
  const spacingX = medianGap(xs) ?? DEFAULT_AISLE_SPACING;
  const maxX = xs.length > 0 ? Math.max(...xs) : 0;

  const ys = aisleBins.map((bin) => bin.y);
  const spacingY = medianGap(ys) ?? DEFAULT_SHELF_SPACING;
  const firstY = ys.length > 0 ? Math.min(...ys) : DEFAULT_FIRST_SHELF_Y;

  return {
    /** x for every shelf in the new aisle - an aisle is a column of bins. */
    x: aisleBins.length > 0 ? maxX + spacingX : spacingX,
    firstShelfY: firstY,
    shelfSpacing: spacingY,
    /** `position` is an ordinal, not a coordinate - see Aisle.java. */
    position: aisles.length + 1,
  };
}

/**
 * Lowest free shelf slot in an aisle.
 *
 * Slots are the grid positions firstShelfY + n * spacing. Taking the lowest
 * free one means a deleted shelf leaves a gap that the next add refills, rather
 * than every add extending the column upward until it leaves the building.
 *
 * @returns The y for the new shelf and its 1-based slot number
 */
export function nextShelfSlot(
  aisle: { bins: { y: number }[] },
  firstShelfY: number,
  shelfSpacing: number,
): { y: number; slot: number } {
  const occupied = aisle.bins.map((bin) => bin.y);
  // Half a gap of tolerance: y values are doubles, and real spacing may be
  // fractional, so exact equality would miss an occupied slot.
  const tolerance = Math.abs(shelfSpacing) / 2 || 0.5;
  const isFree = (y: number) => !occupied.some((oy) => Math.abs(oy - y) < tolerance);

  // Bounded by the slots that could exist plus one, so a full column returns
  // the next slot up rather than looping forever.
  for (let index = 0; index <= occupied.length; index += 1) {
    const y = firstShelfY + index * shelfSpacing;
    if (isFree(y)) return { y, slot: index + 1 };
  }
  const slot = occupied.length + 1;
  return { y: firstShelfY + occupied.length * shelfSpacing, slot };
}

/** y of each shelf in a new aisle, from the bottom up. */
export function shelfYs(count: number, firstShelfY: number, shelfSpacing: number): number[] {
  return Array.from({ length: count }, (_, index) => firstShelfY + index * shelfSpacing);
}

/**
 * Suggests the next aisle name by continuing the existing pattern: A1, A2, A3
 * gives A4. Falls back to a plain count when the names are not of that shape,
 * because real warehouses use their own naming and should not be forced into
 * this one - the admin can always overwrite the suggestion.
 */
export function suggestAisleName(aisles: Aisle[]): string {
  const numbered = aisles
    .map((aisle) => /^([A-Za-z]+)(\d+)$/.exec(aisle.name.trim()))
    .filter((match): match is RegExpExecArray => match !== null);

  if (numbered.length === 0) return `A${aisles.length + 1}`;

  const prefix = numbered[numbered.length - 1][1];
  const highest = Math.max(...numbered.map((match) => Number(match[2])));
  return `${prefix}${highest + 1}`;
}

/**
 * Bin code for a shelf, following the existing "<aisle>-B01" convention.
 * Padded to two digits so codes sort correctly as text.
 */
export function shelfCode(aisleName: string, shelfNumber: number): string {
  return `${aisleName}-B${String(shelfNumber).padStart(2, '0')}`;
}

/** Highest shelf number already used in an aisle, so the next one continues it. */
export function nextShelfNumber(aisle: Aisle): number {
  const numbers = aisle.bins
    .map((bin) => /-B(\d+)$/.exec(bin.code))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => Number(match[1]));
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

import type { Aisle, Bin } from '@/components/warehouse-map';

/** Bins belonging to no aisle - the packing station - are grouped under this. */
export const UNASSIGNED_GROUP = 'Unassigned';

/**
 * A group carries its aisle id because PUT /api/bins replaces the whole record:
 * an edit has to send the bin's aisle back, and /api/bins alone never says
 * which aisle a bin belongs to. Null for the unassigned group.
 */
export type BinGroup = { name: string; aisleId: number | null; bins: Bin[] };

/**
 * Bins whose code or product name contains the query, case-insensitively.
 * An empty query matches everything.
 */
export function filterBins(bins: Bin[], query: string): Bin[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return bins;
  return bins.filter(
    (bin) =>
      bin.code.toLowerCase().includes(needle) || (bin.sku ?? '').toLowerCase().includes(needle),
  );
}

/**
 * Groups bins under their aisle, dropping empty groups.
 *
 * Aisle order follows the API's, so a newly added aisle appears without any
 * change here. Bins no aisle claims - the packing station, or one whose aisle
 * link is broken - land under UNASSIGNED_GROUP rather than being dropped, so a
 * search can never silently hide a match.
 */
export function groupBinsByAisle(aisles: Aisle[], bins: Bin[]): BinGroup[] {
  const codes = new Set(bins.map((bin) => bin.code));
  const claimed = new Set<string>();

  const groups: BinGroup[] = aisles.map((aisle) => {
    const groupBins = aisle.bins.filter((bin) => codes.has(bin.code));
    groupBins.forEach((bin) => claimed.add(bin.code));
    return { name: aisle.name, aisleId: aisle.id, bins: groupBins };
  });

  const unassigned = bins.filter((bin) => !claimed.has(bin.code));
  if (unassigned.length > 0) {
    groups.push({ name: UNASSIGNED_GROUP, aisleId: null, bins: unassigned });
  }

  return groups.filter((group) => group.bins.length > 0);
}

/**
 * Bins that belong to no aisle. These are the packing stations - the fixed
 * start points a route can begin from, as opposed to shelf locations.
 */
export function unaisledBins(aisles: Aisle[], bins: Bin[]): Bin[] {
  const inAisles = new Set(aisles.flatMap((aisle) => aisle.bins.map((bin) => bin.code)));
  return bins.filter((bin) => !inAisles.has(bin.code));
}

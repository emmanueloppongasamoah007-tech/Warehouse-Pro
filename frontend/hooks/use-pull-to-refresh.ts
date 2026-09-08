import { useCallback, useState } from 'react';

/** A screen's existing loader. Resolves once its refetch has settled. */
type Refetch = () => Promise<unknown>;

/**
 * Pull-to-refresh state for a screen's RefreshControl.
 *
 * Screens already own their fetching - a memoised `load` callback writing into a
 * `LoadState`. This adds only the extra flag RefreshControl needs and re-runs
 * those same loaders, so it never becomes a second source of the data or a
 * second copy of the loading state.
 *
 * Pass every loader whose data the screen shows. They run concurrently and the
 * spinner clears once the slowest one settles.
 *
 *     const { refreshing, onRefresh } = usePullToRefresh(loadOrders);
 *
 *     <ScrollView
 *       refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
 *
 * Loaders must be memoised with `useCallback` - they are this hook's dependency
 * list, so an inline arrow would rebuild `onRefresh` on every render.
 */
export function usePullToRefresh(...refetch: Refetch[]) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all(refetch.map((load) => load()));
    } catch {
      // Each loader already reports its own failure through its screen's error
      // state, so there is nothing to show here. Caught only so an unexpected
      // rejection cannot leave the spinner stuck on screen.
    } finally {
      setRefreshing(false);
    }
    // The rest array IS the dependency list - one entry per loader passed in, so
    // its length is fixed per call site and `onRefresh` is rebuilt only when a
    // caller's loader identity changes. ESLint cannot verify a spread like this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refetch);

  return { refreshing, onRefresh };
}

import { useCallback } from "react";
import { optimizeRoute as optimizeRouteApi } from "@/lib/api/routes";
import { useRouteStore } from "@/store/routeStore";

export function useOptimizeRoute() {
  const activeOrder = useRouteStore((state) => state.activeOrder);
  const setLoading = useRouteStore((state) => state.setLoading);
  const setError = useRouteStore((state) => state.setError);
  const setRouteResult = useRouteStore((state) => state.setRouteResult);

  return useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await optimizeRouteApi(activeOrder);
      setRouteResult(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to optimize route.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeOrder, setError, setLoading, setRouteResult]);
}

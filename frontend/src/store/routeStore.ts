import { create } from "zustand";
import { ActiveOrder, OptimizeRouteResponse } from "@/types/route";

interface RouteStoreState {
  activeOrder: ActiveOrder;
  orderedBinCodes: string[];
  totalDistance: number;
  pickedBins: Set<string>;
  isLoading: boolean;
  error: string | null;
  setRouteResult: (response: OptimizeRouteResponse) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (message: string | null) => void;
  confirmPick: (binCode: string) => void;
  resetRoute: () => void;
}

const defaultOrder: ActiveOrder = {
  startCode: "PACK-01",
  pickListCodes: ["A1-B03", "A2-B01", "A3-B04", "A1-B01"],
};

export const useRouteStore = create<RouteStoreState>((set) => ({
  activeOrder: defaultOrder,
  orderedBinCodes: [],
  totalDistance: 0,
  pickedBins: new Set([defaultOrder.startCode]),
  isLoading: false,
  error: null,
  setRouteResult: (response) =>
    set(() => ({
      orderedBinCodes: response.orderedBinCodes,
      totalDistance: response.totalDistance,
      pickedBins: new Set([response.orderedBinCodes[0]]),
      error: null,
    })),
  setLoading: (loading) => set(() => ({ isLoading: loading })),
  setError: (message) => set(() => ({ error: message })),
  confirmPick: (binCode) =>
    set((state) => {
      const nextPicked = new Set(state.pickedBins);
      nextPicked.add(binCode);
      return { pickedBins: nextPicked };
    }),
  resetRoute: () =>
    set(() => ({
      orderedBinCodes: [],
      totalDistance: 0,
      pickedBins: new Set([defaultOrder.startCode]),
      isLoading: false,
      error: null,
    })),
}));

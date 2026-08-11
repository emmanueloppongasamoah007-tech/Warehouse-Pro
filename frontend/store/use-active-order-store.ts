import { create } from 'zustand';

/**
 * The order the Routes screen is currently planning a route for.
 *
 * Orders sets this on tap; Routes reads it. Keeping it in a store rather than
 * passing route params means Routes stays valid when it is reached directly
 * from the tab bar, which is the normal case - a tab press carries no params.
 */

/** Matches backend dto/OrderItemResponse.java. */
export type OrderItem = {
  id: number;
  binCode: string;
  position: number;
  picked: boolean;
};

/** Matches backend dto/OrderResponse.java. */
export type Order = {
  id: number;
  startCode: string;
  pickListCodes: string[];
  items: OrderItem[];
  status: string;
  createdAt: string;
  /** Null until the order is completed. Used to derive how long a pick took. */
  completedAt: string | null;
};

/**
 * Used when nothing has been selected yet - reaching Routes from the tab bar on
 * a cold start. These are the codes seeded by the backend's DataSeeder, which is
 * also the payload its startup log suggests testing with.
 */
export const FALLBACK_START_CODE = 'PACK-01';
export const FALLBACK_PICK_LIST_CODES = ['A1-B03', 'A2-B01', 'A3-B04', 'A1-B01'];

type ActiveOrderState = {
  /** null means no order chosen; Routes falls back to the constants above. */
  order: Order | null;
  setActiveOrder: (order: Order) => void;
  clearActiveOrder: () => void;
};

/**
 * In-memory only. An active selection is working state for the current session,
 * not something to restore on next launch.
 */
export const useActiveOrderStore = create<ActiveOrderState>((set) => ({
  order: null,
  setActiveOrder: (order) => set({ order }),
  clearActiveOrder: () => set({ order: null }),
}));

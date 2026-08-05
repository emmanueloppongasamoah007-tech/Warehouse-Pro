import { create } from "zustand";

interface DevAuthState {
  isDevMode: boolean;
  setDevMode: (enabled: boolean) => void;
}

export const useDevAuthStore = create<DevAuthState>((set) => ({
  isDevMode: false,
  setDevMode: (enabled: boolean) => set({ isDevMode: enabled }),
}));

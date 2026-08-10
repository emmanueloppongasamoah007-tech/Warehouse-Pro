import { create } from 'zustand';

/**
 * Which part of the app a user works in. Chosen on /role-select and read
 * later during signup.
 *
 * The string values are what gets persisted and sent to the backend, so treat
 * them as a wire format: change them only alongside whatever stores them.
 */
export type Role = 'picker' | 'admin';

type RoleState = {
  role: Role | null;
  setRole: (role: Role) => void;
  clearRole: () => void;
};

/**
 * In-memory only. The selection survives navigation between screens but not an
 * app restart, which is the right lifetime for a value that exists to be
 * carried into the signup form a few screens later.
 *
 * If it ever needs to outlive a restart, wrap this in zustand's `persist`
 * middleware with the AsyncStorage adapter already used by lib/supabase.ts.
 */
export const useRoleStore = create<RoleState>((set) => ({
  role: null,
  setRole: (role) => set({ role }),
  clearRole: () => set({ role: null }),
}));

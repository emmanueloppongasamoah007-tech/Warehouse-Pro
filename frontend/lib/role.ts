import type { Role } from '@/store/use-role-store';

/**
 * The single reader of a signed-in account's role.
 *
 * The role lives in Supabase user metadata, written once at signup
 * (signup.tsx sends it as `options.data.role`). It is deliberately NOT read
 * from the local Zustand role store: that store records what was tapped on
 * /role-select, which is only meaningful while creating a new account. Signing
 * in to an existing account must reflect that account's stored role and nothing
 * else, so every sign-in path goes through here.
 *
 * Anything missing or unrecognised resolves to null, which callers treat as a
 * picker rather than failing.
 *
 * Note this is presentation-level only. Metadata is user-writable and hidden
 * tabs remain reachable by direct navigation, so real authorization has to be
 * enforced by the backend.
 */
export function readRoleFromMetadata(metadata: unknown): Role | null {
  if (typeof metadata !== 'object' || metadata === null) return null;
  const value = (metadata as Record<string, unknown>).role;
  return value === 'admin' || value === 'picker' ? value : null;
}

/** First tab of the given role's tab bar - where a sign-in should land. */
export function landingRouteForRole(role: Role | null): '/dashboard' | '/routes' {
  return role === 'admin' ? '/dashboard' : '/routes';
}

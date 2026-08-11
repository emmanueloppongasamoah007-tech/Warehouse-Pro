/**
 * Which part of the app a user works in.
 *
 * Stored in Supabase user metadata. 'picker' is assigned automatically at
 * signup; 'admin' is granted only by editing user_metadata directly in the
 * Supabase dashboard. There is deliberately no way to self-select admin.
 *
 * The string values are a wire format - they are what sits in the database and
 * what the gating logic compares against, so changing one means migrating
 * existing accounts.
 */
export type Role = 'picker' | 'admin';

/** The role every new account is created with. */
export const DEFAULT_SIGNUP_ROLE: Role = 'picker';

/**
 * The single reader of a signed-in account's role.
 *
 * The role lives in Supabase user metadata, written at signup. Signing in to an
 * existing account must reflect that account's stored role and nothing else, so
 * every sign-in path goes through here.
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

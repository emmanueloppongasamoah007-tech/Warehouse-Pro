import { apiGet, apiPost } from '@/lib/client';
import type { Role } from '@/lib/role';

/** Matches backend dto/AppUserResponse.java. */
export type AppUser = {
  id: number;
  supabaseUserId: string;
  name: string;
  email: string;
  employeeId: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

/** Matches backend dto/AppUserRequest.java. */
export type AppUserUpsert = {
  supabaseUserId: string;
  name: string;
  email: string;
  employeeId: string | null;
  role: Role;
};

/**
 * Creates or updates a user's profile row.
 *
 * The backend upserts on supabaseUserId, so calling this again for the same
 * account updates the existing row rather than failing.
 */
export function upsertAppUser(profile: AppUserUpsert): Promise<AppUser> {
  return apiPost<AppUser>('/api/users', profile);
}

/** Profiles, optionally filtered by role. Sorted by name server-side. */
export function fetchAppUsers(role?: Role): Promise<AppUser[]> {
  return apiGet<AppUser[]>(role ? `/api/users?role=${encodeURIComponent(role)}` : '/api/users');
}

/**
 * Mirrors a profile to the backend without letting a failure surface.
 *
 * The Supabase account is the source of truth for identity; this table is a
 * convenience copy so the backend can list users. If the write fails - backend
 * down, device off the LAN - the account still exists and the user must not be
 * blocked. The next profile save reconciles it, because the endpoint upserts.
 */
export async function syncAppUserQuietly(profile: AppUserUpsert): Promise<void> {
  try {
    await upsertAppUser(profile);
  } catch (error) {
    console.warn('Profile sync to backend failed; account is unaffected.', error);
  }
}

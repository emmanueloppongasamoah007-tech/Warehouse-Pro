import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { DEFAULT_SIGNUP_ROLE, readRoleFromMetadata, type Role } from '@/lib/role';
import { supabase } from '@/lib/supabase';
import { syncAppUserQuietly } from '@/lib/users';

/**
 * Google sign-in, shared by the sign-in and sign-up screens.
 *
 * Both screens run an identical flow - the distinction between "signing up with
 * Google" and "signing in with Google" exists only in the button label, because
 * the provider itself decides whether the account is new. Keeping it in one
 * module is what stops the two copies from drifting.
 *
 * The screens own their own banners and navigation, so this returns a result
 * rather than touching either.
 */

// No-op on native. On web the OAuth callback lands back in this same document,
// and this is what settles the pending auth session instead of leaving the
// popup hanging.
WebBrowser.maybeCompleteAuthSession();

export type GoogleAuthResult =
  /** A session now exists. `role` is what the landing route should be chosen from. */
  | { status: 'signed-in'; role: Role | null }
  /** The browser was dismissed without completing. Not an error - say nothing. */
  | { status: 'cancelled' }
  | { status: 'failed'; message: string };

/**
 * Splits an OAuth callback URL's parameters out of both its query string and
 * its fragment.
 *
 * Which half carries the result depends on the flow the Supabase client is
 * configured for: the implicit flow returns `#access_token=...&refresh_token=...`
 * in the fragment, PKCE returns `?code=...` in the query. Reading both means
 * this keeps working if that default is ever changed in lib/supabase.
 *
 * Hand-rolled rather than using URL/URLSearchParams: React Native's versions of
 * those are polyfills with a history of gaps, and fragment handling is exactly
 * the sort of edge they tend to miss.
 */
function readCallbackParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  const hashAt = url.indexOf('#');
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : url.slice(hashAt + 1);

  const queryAt = beforeHash.indexOf('?');
  const query = queryAt === -1 ? '' : beforeHash.slice(queryAt + 1);

  for (const section of [query, hash]) {
    for (const pair of section.split('&')) {
      if (!pair) continue;
      const equalsAt = pair.indexOf('=');
      const rawKey = equalsAt === -1 ? pair : pair.slice(0, equalsAt);
      const rawValue = equalsAt === -1 ? '' : pair.slice(equalsAt + 1);
      try {
        params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
      } catch {
        // One malformed percent-escape must not discard the whole callback -
        // the token we actually need may be in the next pair.
        params[rawKey] = rawValue;
      }
    }
  }

  return params;
}

/** A display name from Google's profile claims, falling back to the address. */
function readNameFromMetadata(metadata: unknown, email: string): string {
  if (typeof metadata === 'object' && metadata !== null) {
    const record = metadata as Record<string, unknown>;
    // Google populates full_name; name is the more generic spelling other
    // providers use. Either is better than showing an email as a name.
    for (const key of ['full_name', 'name'] as const) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return email;
}

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    // The URL this app answers on. In a dev or release build that is
    // `warehousepro://`, from the `scheme` in app.json - not the slug, which is
    // `frontend`. Under Expo Go it is instead `exp://<lan-ip>:8081/--/`.
    //
    // Whatever this resolves to must be on Supabase's redirect allow-list. An
    // entry that does not match is not an error there: Supabase redirects to the
    // Site URL instead, having already created the account, and the browser then
    // never reaches the URL openAuthSessionAsync is waiting for.
    const redirectTo = Linking.createURL('/');

    if (__DEV__) {
      console.log('[google-auth] awaiting redirect to', redirectTo);
    }

    // On native this only builds the provider URL - there is no browser for the
    // client to redirect on its own, so skipBrowserRedirect just makes that
    // explicit and keeps the web build from navigating out from under us.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error) return { status: 'failed', message: error.message };
    if (!data?.url) {
      return { status: 'failed', message: 'Google sign-in did not return a sign-in URL.' };
    }

    // Resolves when the browser redirects to `redirectTo`, and also when the
    // user simply closes it - the dismissed case is a plain result, not a throw,
    // which is what keeps a cancelled sign-in from hanging this call forever.
    const outcome = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (outcome.type !== 'success') return { status: 'cancelled' };

    const params = readCallbackParams(outcome.url);

    // Google can also refuse inside the browser - consent declined, app
    // blocked - and that comes back on the redirect rather than as a throw.
    const providerError = params.error_description || params.error;
    if (providerError) return { status: 'failed', message: providerError };

    let user;
    if (params.access_token && params.refresh_token) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (sessionError) return { status: 'failed', message: sessionError.message };
      user = sessionData.user;
    } else if (params.code) {
      // PKCE's half of the same step. See readCallbackParams.
      const { data: sessionData, error: sessionError } =
        await supabase.auth.exchangeCodeForSession(params.code);
      if (sessionError) return { status: 'failed', message: sessionError.message };
      user = sessionData.user;
    } else {
      return { status: 'failed', message: 'Google sign-in did not return a session.' };
    }

    if (!user) return { status: 'failed', message: 'Google sign-in did not return an account.' };

    // An account that already carries a role keeps it. This is the guard that
    // stops an admin from being demoted to picker every time they use Google,
    // since Google itself knows nothing about roles.
    const existingRole = readRoleFromMetadata(user.user_metadata);
    if (existingRole) return { status: 'signed-in', role: existingRole };

    // First Google sign-in for this account: stamp the same role signup assigns,
    // so every later sign-in takes the branch above.
    const { error: roleError } = await supabase.auth.updateUser({
      data: { role: DEFAULT_SIGNUP_ROLE },
    });
    if (roleError) {
      // The session is real and usable, so this must not read as a failed
      // sign-in. Without the stamp the account resolves to picker anyway, and
      // the next Google sign-in retries this same write.
      console.warn('Could not store the default role on the account.', roleError);
    }

    // Mirrored only on first sign-in, not on every one. The endpoint upserts the
    // whole row, so re-sending employeeId: null later would wipe an ID the
    // warehouse had since assigned in Settings.
    //
    // Deliberately not awaited. This is a best-effort copy - see the note on
    // syncAppUserQuietly - and the hosted backend sleeps when idle, so this
    // request can take ~30s to answer. Awaiting it held the user on the sign-in
    // screen for that whole wait with no indication anything was happening.
    // Nothing below depends on the result, and the endpoint upserts, so a lost
    // write is reconciled by the next profile save.
    void syncAppUserQuietly({
      supabaseUserId: user.id,
      name: readNameFromMetadata(user.user_metadata, user.email ?? ''),
      email: user.email ?? '',
      employeeId: null,
      role: DEFAULT_SIGNUP_ROLE,
    });

    return { status: 'signed-in', role: DEFAULT_SIGNUP_ROLE };
  } catch (caught) {
    // Transport failures and anything the browser module throws on the way out.
    return {
      status: 'failed',
      message:
        caught instanceof Error
          ? `Could not complete Google sign-in: ${caught.message}`
          : 'Could not complete Google sign-in.',
    };
  }
}

import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { readRoleFromMetadata, type Role } from '@/lib/role';
import { supabase } from '@/lib/supabase';

/**
 * `loading` is distinct from `signed-out` on purpose: a guard must not redirect
 * before the session has been read, or it would bounce a valid user out on
 * every mount.
 */
export type SessionRole =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; role: Role | null };

/**
 * Current session's role, kept in sync with Supabase auth state.
 *
 * Reads the locally stored session rather than calling getUser(): this drives
 * presentation only, and a network round trip would delay every mount. Role
 * always comes from the account's own metadata - never from the local
 * role store, which describes a signup in progress rather than an account.
 */
export function useSessionRole(): SessionRole {
  const [state, setState] = useState<SessionRole>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    function apply(session: Session | null) {
      if (!active) return;
      setState(
        session
          ? { status: 'signed-in', role: readRoleFromMetadata(session.user?.user_metadata) }
          : { status: 'signed-out' },
      );
    }

    supabase.auth.getSession().then(({ data }) => apply(data.session));

    // Fires INITIAL_SESSION immediately on subscribe, then again on sign-in,
    // sign-out and metadata updates.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => apply(session));

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

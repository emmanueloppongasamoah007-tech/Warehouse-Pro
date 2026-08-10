import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSessionRole } from '@/hooks/use-session-role';
import { landingRouteForRole } from '@/lib/role';

/**
 * Renders `children` only for an admin session.
 *
 * `href: null` in the tab layout hides a tab from the bar but leaves its route
 * mounted and reachable by direct navigation or a deep link, so the tab bar is
 * not a guard. This is.
 *
 * Still presentation-level: user metadata is user-writable and the backend has
 * no auth on /api/**, so this stops accidental access, not a determined one.
 * Real enforcement belongs server-side.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const session = useSessionRole();

  // Redirecting before the session resolves would bounce a valid admin out on
  // every mount, so wait rather than guess.
  if (session.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#f97316" />
      </View>
    );
  }

  if (session.status === 'signed-out') {
    return <Redirect href="/signin" />;
  }

  if (session.role !== 'admin') {
    // Sends a picker to their own landing tab rather than a hardcoded route,
    // so this stays correct if the picker's first tab ever changes.
    return <Redirect href={landingRouteForRole(session.role)} />;
  }

  return <>{children}</>;
}

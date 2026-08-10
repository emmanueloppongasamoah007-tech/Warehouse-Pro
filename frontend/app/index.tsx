import { Redirect } from 'expo-router';

/**
 * App entry point.
 *
 * Removing the template's `(tabs)/index.tsx` leaves nothing matching "/", which
 * would land a cold start on expo-router's Unmatched Route screen. Redirecting
 * to onboarding also keeps the tab bar behind the auth flow: signin does
 * router.replace('/routes'), which is the first point tabs become reachable.
 *
 * This is a static redirect, not an auth guard - it does not check for an
 * existing session, so a signed-in user still starts at onboarding. Wiring that
 * up is a separate step.
 */
export default function Index() {
  return <Redirect href="/onboarding" />;
}

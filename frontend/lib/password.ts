/**
 * Password rule shared by every screen that sets a password.
 *
 * Kept in one module so the hint text and the check cannot disagree, and so a
 * second screen cannot quietly reintroduce an older rule.
 *
 * Supabase enforces its own project-level policy server-side; this is a
 * client-side pre-check so the user gets feedback without a round trip. The two
 * are configured independently - tighten one and you must tighten the other.
 */
export const PASSWORD_HINT =
  'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';

/** Returns a human-readable problem, or null when the password is acceptable. */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a special character.';
  return null;
}

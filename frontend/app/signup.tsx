import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmailField } from '@/components/email-field';
import { FIELD_BASE_CLASSNAME, useStableTextStyle } from '@/components/field-config';
import { PasswordField } from '@/components/password-field';
import { usePalette } from '@/hooks/use-palette';
import { signInWithGoogle } from '@/lib/google-auth';
import { PASSWORD_HINT, validatePassword } from '@/lib/password';
import { DEFAULT_SIGNUP_ROLE, landingRouteForRole, readRoleFromMetadata } from '@/lib/role';
import { supabase } from '@/lib/supabase';
import { syncAppUserQuietly } from '@/lib/users';

/** How long "Account created." stays on screen before the tabs replace it. */
const SUCCESS_REDIRECT_MS = 900;

export default function SignupScreen() {
  const router = useRouter();
  const palette = usePalette();
  const stableTextStyle = useStableTextStyle();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Navigating away unmounts this screen mid-timeout. Clearing it avoids a
  // router.replace firing from a screen that no longer exists.
  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  async function handleCreateAccount() {
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMessage('Enter your name.');
      return;
    }
    if (!trimmedEmail) {
      setErrorMessage('Enter your email address.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    const passwordProblem = validatePassword(password);
    if (passwordProblem) {
      setErrorMessage(passwordProblem);
      return;
    }

    setSubmitting(true);
    // Set when the success path schedules a redirect, so `finally` can leave the
    // button disabled instead of re-enabling it mid-transition.
    let redirecting = false;
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        // Every new account is a picker. Admin accounts are granted only by
        // editing user_metadata in the Supabase dashboard.
        //
        // Name is stored here as well as in the backend profile table: Settings
        // reads metadata directly, and it keeps the account self-describing even
        // if the backend write below never lands.
        options: { data: { name: trimmedName, role: DEFAULT_SIGNUP_ROLE } },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // Mirror the profile to the backend so admins can list pickers.
      // Deliberately not awaited: the Supabase account already exists, so a
      // backend outage must not read as a failed signup, and the hosted backend
      // sleeps when idle - awaiting it stalls the screen for ~30s on the first
      // request after a quiet period. syncAppUserQuietly swallows and logs its
      // own errors, and the endpoint upserts, so a lost write is reconciled by
      // the next profile save.
      if (data.user) {
        void syncAppUserQuietly({
          supabaseUserId: data.user.id,
          name: trimmedName,
          email: trimmedEmail,
          // Assigned by the warehouse later, in Settings.
          employeeId: null,
          role: DEFAULT_SIGNUP_ROLE,
        });
      }

      // signUp returns a session only when email confirmation is disabled on
      // the Supabase project. With it enabled the account exists but cannot be
      // used yet, so there is nothing to enter the app with.
      if (data.session) {
        setSuccessMessage('Account created. Taking you in...');
        // A brief pause so the picker sees the confirmation before the tabs
        // replace the screen. replace, not push: signup must not stay on the
        // back stack once a session exists.
        //
        // Role comes from the account rather than DEFAULT_SIGNUP_ROLE, so this
        // stays correct if the assigned role ever changes.
        const role = readRoleFromMetadata(data.user?.user_metadata);
        redirectTimer.current = setTimeout(() => {
          router.replace(landingRouteForRole(role));
        }, SUCCESS_REDIRECT_MS);
        // Returns while still submitting, so the button stays disabled through
        // the pause - re-enabling it would allow a second signup attempt with
        // an account that already exists.
        redirecting = true;
        return;
      }

      setSuccessMessage(
        'Account created. Check your email to confirm your address before signing in.',
      );
    } catch (caught) {
      // signUp rejects on transport failure rather than returning an error object.
      setErrorMessage(
        caught instanceof Error
          ? `Could not reach Supabase: ${caught.message}`
          : 'Could not reach Supabase.',
      );
    } finally {
      if (!redirecting) setSubmitting(false);
    }
  }

  async function handleGoogleSignup() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      const result = await signInWithGoogle();

      // Dismissing the browser is a decision, not a fault.
      if (result.status === 'cancelled') return;

      if (result.status === 'failed') {
        setErrorMessage(result.message);
        return;
      }

      // No pause and no "Account created" banner, unlike the email path: Google
      // has already confirmed the address, so there is no confirm-your-email
      // step to explain and nothing to read before the tabs appear.
      router.replace(landingRouteForRole(result.role));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      {/* Status bar content follows the scheme: this screen is light or dark, unlike
          onboarding, which is dark in both. */}
      <StatusBar style="auto" />

      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-8 pb-10 pt-8"
            keyboardShouldPersistTaps="handled">
            <View className="items-center">
              <View className="h-20 w-20 items-center justify-center rounded-3xl bg-orange-500">
                <MaterialCommunityIcons name="warehouse" size={44} color="#ffffff" />
              </View>

              <Text className="mt-6 text-3xl font-bold text-slate-900 dark:text-slate-100">
                Create account
              </Text>
              <Text className="mt-2 text-center text-base text-slate-500 dark:text-slate-400">
                Sign up with email and password or continue with Google
              </Text>
            </View>

            <View className="mt-8 gap-4">
              <View>
                <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  editable={!submitting}
                  placeholder="e.g. Ama Mensah"
                  placeholderTextColor={palette.muted}
                  autoCapitalize="words"
                  autoComplete="name"
                  autoCorrect={false}
                  textAlignVertical="center"
                  returnKeyType="next"
                  className={`${FIELD_BASE_CLASSNAME} px-4`}
                  style={stableTextStyle}
                />
              </View>

              <View>
                <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </Text>
                <EmailField
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@gmail.com"
                  placeholderTextColor={palette.muted}
                  editable={!submitting}
                />
              </View>

              <View>
                <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </Text>
                <PasswordField
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter a password"
                  placeholderTextColor={palette.muted}
                  autoComplete="new-password"
                  editable={!submitting}
                />
                <Text className="mt-1.5 text-xs leading-4 text-slate-500 dark:text-slate-400">
                  {PASSWORD_HINT}
                </Text>
              </View>

              <View>
                <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Confirm password
                </Text>
                <PasswordField
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor={palette.muted}
                  autoComplete="new-password"
                  editable={!submitting}
                />
              </View>
            </View>

            {errorMessage ? (
              <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
                <Text className="text-sm text-red-700 dark:text-red-400">{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <Text className="text-sm text-emerald-700 dark:text-emerald-400">
                  {successMessage}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleCreateAccount}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Create account"
              accessibilityState={{ disabled: submitting }}
              className={`mt-6 h-14 flex-row items-center justify-center rounded-full ${
                submitting ? 'bg-orange-300' : 'bg-orange-500 active:bg-orange-600'
              }`}>
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-lg font-semibold text-white">Create account</Text>
              )}
            </Pressable>

            <View className="my-5 flex-row items-center">
              <View className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <Text className="mx-3 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                or
              </Text>
              <View className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </View>

            <Pressable
              onPress={handleGoogleSignup}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              className="h-14 flex-row items-center justify-center rounded-full border border-slate-300 bg-white active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:active:bg-slate-800">
              <MaterialCommunityIcons name="google" size={20} color={palette.strong} />
              <Text className="ml-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                Continue with Google
              </Text>
            </Pressable>

            <View className="mt-8 flex-row items-center justify-center">
              <Text className="text-sm text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
              </Text>
              <Pressable
                onPress={() => router.push('/signin')}
                accessibilityRole="link"
                accessibilityLabel="Sign in">
                <Text className="text-sm font-semibold text-orange-600">Sign in</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

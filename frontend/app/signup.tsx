import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmailField } from '@/components/email-field';
import { PasswordField } from '@/components/password-field';
import { PASSWORD_HINT, validatePassword } from '@/lib/password';
import { supabase } from '@/lib/supabase';
import { useRoleStore } from '@/store/use-role-store';

export default function SignupScreen() {
  const router = useRouter();
  const role = useRoleStore((state) => state.role);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleCreateAccount() {
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();

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
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        // Carried through as user metadata so the role chosen on /role-select
        // is attached to the account at creation time.
        options: { data: { role } },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // With "Confirm email" enabled the user exists but has no session yet.
      // Reporting "signed in" here would be wrong, so the two cases differ.
      setSuccessMessage(
        data.session
          ? 'Account created. You are signed in.'
          : 'Account created. Check your email to confirm your address before signing in.',
      );
    } catch (caught) {
      // signUp rejects on transport failure rather than returning an error object.
      setErrorMessage(
        caught instanceof Error
          ? `Could not reach Supabase: ${caught.message}`
          : 'Could not reach Supabase.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoogleSignup() {
    // PLACEHOLDER: real Google OAuth is a later step.
    setSuccessMessage(null);
    setErrorMessage('Google sign-up is not wired up yet.');
  }

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      {/* Dark status bar content: this screen is light, unlike onboarding. */}
      <StatusBar style="dark" />

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

              <Text className="mt-6 text-3xl font-bold text-slate-900">Create account</Text>
              <Text className="mt-2 text-center text-base text-slate-500">
                Sign up with email and password or continue with Google
              </Text>

              {role ? (
                <View className="mt-4 flex-row items-center rounded-full bg-orange-100 px-3 py-1">
                  <MaterialCommunityIcons name="account-check-outline" size={14} color="#c2410c" />
                  <Text className="ml-1.5 text-xs font-semibold uppercase tracking-wide text-orange-700">
                    {role}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="mt-8 gap-4">
              <View>
                <Text className="mb-1.5 text-sm font-medium text-slate-700">Email</Text>
                <EmailField
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@company.com"
                  placeholderTextColor="#94a3b8"
                  editable={!submitting}
                />
              </View>

              <View>
                <Text className="mb-1.5 text-sm font-medium text-slate-700">Password</Text>
                <PasswordField
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter a password"
                  placeholderTextColor="#94a3b8"
                  autoComplete="new-password"
                  editable={!submitting}
                />
                <Text className="mt-1.5 text-xs leading-4 text-slate-500">{PASSWORD_HINT}</Text>
              </View>

              <View>
                <Text className="mb-1.5 text-sm font-medium text-slate-700">Confirm password</Text>
                <PasswordField
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#94a3b8"
                  autoComplete="new-password"
                  editable={!submitting}
                />
              </View>
            </View>

            {errorMessage ? (
              <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm text-red-700">{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <Text className="text-sm text-emerald-700">{successMessage}</Text>
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
              <View className="h-px flex-1 bg-slate-200" />
              <Text className="mx-3 text-xs uppercase tracking-wide text-slate-400">or</Text>
              <View className="h-px flex-1 bg-slate-200" />
            </View>

            <Pressable
              onPress={handleGoogleSignup}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              className="h-14 flex-row items-center justify-center rounded-full border border-slate-300 bg-white active:bg-slate-100">
              <MaterialCommunityIcons name="google" size={20} color="#0f172a" />
              <Text className="ml-2 text-base font-semibold text-slate-900">
                Continue with Google
              </Text>
            </Pressable>

            <View className="mt-8 flex-row items-center justify-center">
              <Text className="text-sm text-slate-500">Already have an account? </Text>
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

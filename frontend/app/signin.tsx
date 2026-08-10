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
import { landingRouteForRole, readRoleFromMetadata } from '@/lib/role';
import { supabase } from '@/lib/supabase';
import { useRoleStore } from '@/store/use-role-store';

export default function SignInScreen() {
  const router = useRouter();
  const clearRole = useRoleStore((state) => state.clearRole);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignIn() {
    setErrorMessage(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setErrorMessage('Enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // Whatever was tapped on /role-select belongs to the signup flow only.
      // Clearing it here means a stale selection cannot follow this session
      // into signup later, or be mistaken for this account's role.
      clearRole();

      // Read from the account that just authenticated - never from the local
      // role store. An existing account's stored role is the only thing that
      // decides which tabs it gets.
      const role = readRoleFromMetadata(data.user?.user_metadata);

      // replace, not push: the sign-in screen should not be reachable by going
      // back once a session exists.
      router.replace(landingRouteForRole(role));
    } catch (caught) {
      // signInWithPassword rejects on transport failure rather than returning
      // an error object.
      setErrorMessage(
        caught instanceof Error
          ? `Could not reach Supabase: ${caught.message}`
          : 'Could not reach Supabase.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoogleSignIn() {
    // PLACEHOLDER: real Google OAuth is a later step. Matches signup.tsx.
    setErrorMessage('Google sign-in is not wired up yet.');
  }

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      {/* Dark status bar content: this screen is light, like signup. */}
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

              <Text className="mt-6 text-3xl font-bold text-slate-900">Welcome back</Text>
              <Text className="mt-2 text-center text-base text-slate-500">
                Sign in to continue
              </Text>
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
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  autoComplete="current-password"
                  editable={!submitting}
                />
              </View>
            </View>

            {errorMessage ? (
              <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm text-red-700">{errorMessage}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSignIn}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: submitting }}
              className={`mt-6 h-14 flex-row items-center justify-center rounded-full ${
                submitting ? 'bg-orange-300' : 'bg-orange-500 active:bg-orange-600'
              }`}>
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-lg font-semibold text-white">Sign in</Text>
              )}
            </Pressable>

            <View className="my-5 flex-row items-center">
              <View className="h-px flex-1 bg-slate-200" />
              <Text className="mx-3 text-xs uppercase tracking-wide text-slate-400">or</Text>
              <View className="h-px flex-1 bg-slate-200" />
            </View>

            <Pressable
              onPress={handleGoogleSignIn}
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
              <Text className="text-sm text-slate-500">Don&apos;t have an account? </Text>
              <Pressable
                onPress={() => router.push('/signup')}
                accessibilityRole="link"
                accessibilityLabel="Sign up">
                <Text className="text-sm font-semibold text-orange-600">Sign up</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

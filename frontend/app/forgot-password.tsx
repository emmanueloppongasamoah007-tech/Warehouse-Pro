import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
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
import { usePalette } from '@/hooks/use-palette';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const palette = usePalette();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Wrapped rather than passing setEmail directly: a success banner names the
  // address it was sent to, so it must not stay on screen once that address is
  // edited. useCallback keeps the identity stable, which is what lets the memo
  // on EmailField hold - see components/email-field.
  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    setSuccessMessage(null);
  }, []);

  async function handleSendResetLink() {
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage('Enter your email address.');
      return;
    }

    setSubmitting(true);
    try {
      // Supabase sends the email itself. The link in it points at Supabase's
      // hosted recovery page, so it opens in a browser rather than deep-linking
      // back here; the picker sets a new password there and returns to sign in
      // normally. Deep-linking recovery into the app is a separate task.
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // Deliberately not "we sent an email to that account": Supabase returns
      // success whether or not the address is registered, precisely so this
      // screen cannot be used to test which emails have accounts. Wording that
      // confirmed delivery would leak exactly that.
      setSuccessMessage(
        'Check your email for a reset link. It opens in your browser - set a new ' +
          'password there, then come back here and sign in.',
      );
    } catch (caught) {
      // resetPasswordForEmail rejects on transport failure rather than returning
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

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      {/* Status bar content follows the scheme, like the other auth screens. */}
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
                Reset password
              </Text>
              <Text className="mt-2 text-center text-base text-slate-500 dark:text-slate-400">
                Enter your account email to get a reset link
              </Text>
            </View>

            <View className="mt-8">
              <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </Text>
              <EmailField
                value={email}
                onChangeText={handleEmailChange}
                placeholder="you@company.com"
                placeholderTextColor={palette.muted}
                editable={!submitting}
              />
            </View>

            {errorMessage ? (
              <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
                <Text className="text-sm text-red-700 dark:text-red-400">{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <Text className="text-sm leading-5 text-emerald-700 dark:text-emerald-400">
                  {successMessage}
                </Text>
              </View>
            ) : null}

            {/* Stays enabled after a send: the mail can be slow or land in spam,
                and re-sending is the obvious recovery. Supabase rate-limits the
                endpoint, and that limit surfaces in the error banner. */}
            <Pressable
              onPress={handleSendResetLink}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Send reset link"
              accessibilityState={{ disabled: submitting }}
              className={`mt-6 h-14 flex-row items-center justify-center rounded-full ${
                submitting ? 'bg-orange-300' : 'bg-orange-500 active:bg-orange-600'
              }`}>
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-lg font-semibold text-white">Send reset link</Text>
              )}
            </Pressable>

            <View className="mt-8 flex-row items-center justify-center">
              <Text className="text-sm text-slate-500 dark:text-slate-400">
                Remembered it?{' '}
              </Text>
              <Pressable
                // replace, not push: this screen is reached from sign-in, so
                // pushing another sign-in would stack a second copy behind it.
                onPress={() => router.replace('/signin')}
                disabled={submitting}
                accessibilityRole="link"
                accessibilityLabel="Back to sign in">
                <Text className="text-sm font-semibold text-orange-600">Sign in</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

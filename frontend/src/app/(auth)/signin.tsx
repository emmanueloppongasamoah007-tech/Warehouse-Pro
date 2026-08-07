import React, { useState } from "react";
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { images } from "@/constants/images";
import { getAuthRedirectUrl } from "@/lib/deeplink";
import { supabase } from "@/lib/supabase";
import { useDevAuthStore } from "@/store/devAuthStore";
import {
  getEmailValidationMessage,
} from "@/lib/auth";

const DEV_ADMIN_EMAIL = "admin@gmail.com";
const DEV_ADMIN_PASSWORD = "admin";

export default function SignIn() {
  const router = useRouter();
  const setDevMode = useDevAuthStore((state) => state.setDevMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onPrimaryPress() {
    setError(null);
    setMessage(null);

    const emailError = getEmailValidationMessage(email);
    const passwordError = password ? null : "Please enter your password.";

    if (emailError) {
      setError(emailError);
      return;
    }

    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Dev admin login
    if (email.trim() === DEV_ADMIN_EMAIL && password === DEV_ADMIN_PASSWORD) {
      setDevMode(true);
      router.replace("/routes");
      return;
    }

    setIsSubmitting(true);
    const { error, data } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data?.session?.user) {
      router.replace("/routes");
      return;
    }

    setMessage("Signed in successfully. Redirecting to routes...");
    setEmail("");
    setPassword("");
  }

  async function onGooglePress() {
    setError(null);
    setMessage(null);

    const redirectTo = getAuthRedirectUrl("/routes");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setError(error.message);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View className="flex-1 px-6 pt-10">
        <View className="items-center">
          <View className="items-center justify-center rounded-3xl bg-orange-600 p-5 shadow-sm shadow-orange-200/60">
            <Image source={images.warehouse} className="h-16 w-16" />
          </View>
          <Text className="mt-5 text-2xl font-semibold text-slate-900">Sign in</Text>
          <Text className="mt-2 text-center text-base text-slate-600">Sign in with email and password or continue with Google</Text>
        </View>

        <View className="mt-8">
          <Text className="mb-2 text-sm text-slate-700">Email</Text>
          <TextInput
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
              setMessage(null);
            }}
            placeholder="you@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          />

          <Text className="mb-2 mt-4 text-sm text-slate-700">Password</Text>
          <TextInput
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
              setMessage(null);
            }}
            placeholder="Enter your password"
            secureTextEntry
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          />

          <TouchableOpacity
            className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
            onPress={onGooglePress}
          >
            <Text className="text-center">Continue with Google</Text>
          </TouchableOpacity>

          {error ? <Text className="mt-3 text-center text-sm text-red-600">{error}</Text> : null}
          {message ? <Text className="mt-3 text-center text-sm text-slate-600">{message}</Text> : null}

          <TouchableOpacity
            onPress={onPrimaryPress}
            disabled={isSubmitting}
            className="mt-6 rounded-full bg-orange-700 px-6 py-4"
          >
            <Text className="text-center text-base font-semibold text-white">Sign in</Text>
          </TouchableOpacity>

          <View className="mt-6 flex-row justify-center">
            <Text className="text-sm text-slate-600">New here? </Text>
            <Pressable onPress={() => router.push("/signup")}>
              <Text className="text-sm font-semibold text-orange-700">Create account</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
});


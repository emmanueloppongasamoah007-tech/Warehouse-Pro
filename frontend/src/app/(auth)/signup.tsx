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
import * as Linking from "expo-linking";
import { images } from "@/constants/images";
import { supabase } from "@/lib/supabase";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onPrimaryPress() {
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setIsSubmitting(true);
    const redirectTo = Linking.createURL("/routes", { scheme: "frontend" });
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    });
    setIsSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Check your email for a verification link.");
    setEmail("");
  }

  async function onGooglePress() {
    setError(null);
    setMessage(null);

    const redirectTo = Linking.createURL("/routes", { scheme: "frontend" });
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
          <Text className="mt-5 text-2xl font-semibold text-slate-900">Create account</Text>
          <Text className="mt-2 text-center text-base text-slate-600">Sign up with email or continue with Google</Text>
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
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          />

          <TouchableOpacity className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3" onPress={onGooglePress}>
            <Text className="text-center">Continue with Google</Text>
          </TouchableOpacity>

          {error ? <Text className="mt-3 text-center text-sm text-red-600">{error}</Text> : null}
          {message ? <Text className="mt-3 text-center text-sm text-slate-600">{message}</Text> : null}

          <TouchableOpacity
            onPress={onPrimaryPress}
            disabled={isSubmitting}
            className="mt-6 rounded-full bg-orange-700 px-6 py-4"
          >
            <Text className="text-center text-base font-semibold text-white">Create account</Text>
          </TouchableOpacity>

          <View className="mt-6 flex-row justify-center">
            <Text className="text-sm text-slate-600">Already have an account? </Text>
            <Pressable onPress={() => router.push("/signin")}>
              <Text className="text-sm font-semibold text-orange-700">Sign in</Text>
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

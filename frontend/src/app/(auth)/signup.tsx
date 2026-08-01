import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  const [showModal, setShowModal] = useState(false);
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
    const redirectTo = Linking.createURL("/");
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

    setMessage("Check your email for a 6-digit code.");
    setShowModal(true);
  }

  async function onGooglePress() {
    setError(null);
    setMessage(null);

    const redirectTo = Linking.createURL("/");
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

        {showModal && (
          <VerificationModal
            email={email}
            onClose={() => setShowModal(false)}
            onSuccess={() => router.replace("/")}
            onError={(message) => setError(message)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function VerificationModal({
  email,
  onClose,
  onSuccess,
  onError,
}: {
  email: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  async function verifyCode(fullCode: string) {
    setIsVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: fullCode,
      type: "email",
    });
    setIsVerifying(false);

    if (error) {
      onError(error.message);
      return;
    }

    onSuccess();
  }

  function handleChange(text: string, idx: number) {
    if (!/^[0-9]?$/.test(text)) return;
    const next = [...code];
    next[idx] = text;
    setCode(next);
    if (text && idx < 5) {
      inputs.current[idx + 1]?.focus();
    }
    if (idx === 5 && text) {
      const full = next.join("");
      if (full.length === 6) {
        verifyCode(full);
      }
    }
  }

  function handleKeyPress(e: any, idx: number) {
    if (e.nativeEvent.key === "Backspace" && code[idx] === "" && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  return (
    <Modal transparent animationType="fade" visible>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={modalStyles.centered}>
        <View className="m-6 rounded-2xl bg-white p-6 shadow-lg">
          <Text className="mb-2 text-lg font-semibold text-slate-900">Verification code</Text>
          <Text className="mb-4 text-sm text-slate-600">We sent a 6-digit code to your email. Enter it below.</Text>

          <View className="flex-row justify-center">
            {code.map((c, i) => (
              <TextInput
                key={i}
                ref={(ref) => {
                  inputs.current[i] = ref;
                }}
                value={c}
                onChangeText={(t) => handleChange(t.replace(/[^0-9]/g, ""), i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                style={modalStyles.codeInput}
                textContentType="oneTimeCode"
              />
            ))}
          </View>

          <View className="mt-6 flex-row justify-between">
            <TouchableOpacity onPress={onClose} className="mr-3">
              <Text className="text-sm text-slate-600">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => verifyCode(code.join(""))} disabled={isVerifying || code.join("").length !== 6}>
              <Text className={`text-sm font-semibold ${isVerifying ? "text-slate-400" : "text-orange-700"}`}>
                {isVerifying ? "Verifying…" : "Verify"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
});

const modalStyles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  codeInput: {
    width: 48,
    height: 56,
    marginHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    textAlign: "center",
    fontSize: 20,
  },
});

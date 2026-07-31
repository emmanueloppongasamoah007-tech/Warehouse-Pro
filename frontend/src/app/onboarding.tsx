import { Image, ImageBackground, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { images } from "@/constants/images";

export default function Onboarding() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={images.onboardingBackground}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        blurRadius={2}
      >
        <View className="flex-1 px-8 py-10">
          <View className="flex-1 justify-center">
            <View className="items-center">
              <View className="items-center justify-center rounded-3xl bg-orange-600 p-5 shadow-sm shadow-orange-200/60">
                <Image source={images.warehouse} className="h-16 w-16" />
              </View>
              <Text className="mt-5 text-2xl font-semibold text-slate-900 text-center">Warehouse Pro</Text>
              <View className="mt-4 h-1 w-20 rounded-full bg-orange-700" />
            </View>

            <View className="mt-30 items-center">
              <Text className="text-center text-3xl font-semibold text-slate-900">
                Logistics Management
              </Text>
              <Text className="mt-3 text-center text-base leading-7 text-white">
                Optimize your route, maximize your output.
              </Text>
            </View>

            <View className="mt-4">
              <Link href="/signup" asChild>
                <View className="rounded-full bg-orange-700 px-6 py-4">
                  <Text className="text-center text-base font-semibold text-white">Get Started →</Text>
                </View>
              </Link>
            </View>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EFF6FF",
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  backgroundImage: {
    resizeMode: "cover",
  },
});

import { Tabs } from "expo-router";
import { Animated, Image, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { images } from "@/constants/images";

const tabs = [
  { name: "routes", label: "Routes", icon: images.routes },
  { name: "inventory", label: "Inventory", icon: images.inventory },
  { name: "orders", label: "Orders", icon: images.orders },
  { name: "settings", label: "Settings", icon: images.settings },
];

const CIRCLE_SIZE = 56;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabWidth = width / tabs.length;
  const translateX = useRef(new Animated.Value(state.index * tabWidth + (tabWidth - CIRCLE_SIZE) / 2)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: state.index * tabWidth + (tabWidth - CIRCLE_SIZE) / 2,
      useNativeDriver: true,
      damping: 16,
      stiffness: 180,
      mass: 1,
      overshootClamping: true,
    }).start();
  }, [state.index, tabWidth, translateX]);

  return (
    <View
      style={{
        position: "relative",
        width,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 16),
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 8,
          left: 0,
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: CIRCLE_SIZE / 2,
          backgroundColor: "#F97316",
          transform: [{ translateX }],
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const tab = tabs.find((item) => item.name === route.name);
          const icon = tab?.icon ?? "•";
          const label = tab?.label ?? route.name;

          return (
            <View
              key={route.key}
              style={{
                width: tabWidth,
                paddingTop: 8,
                paddingBottom: 8,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
                  <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => navigation.navigate(route.name)}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  source={icon}
                  style={{
                    width: 24,
                    height: 24,
                    tintColor: focused ? "#FFFFFF" : "#475569",
                    resizeMode: "contain",
                  }}
                />
                {!focused ? (
                  <View style={{ marginTop: 4 }}>
                    <Animated.Text
                      style={{
                        fontSize: 12,
                        color: "#475569",
                      }}
                    >
                      {label}
                    </Animated.Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function MainLayout() {
  return <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />} />;
}

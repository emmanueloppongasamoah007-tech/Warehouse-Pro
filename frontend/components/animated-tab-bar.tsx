import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePalette } from '@/hooks/use-palette';

/**
 * Bottom tab bar where the focused tab sits inside a filled circle that slides
 * between slots.
 *
 * Replaces the default bar's rendering only. Colors, labels, icons, order and
 * haptics all still come from the same `screenOptions` the default bar read, so
 * the bar looks and behaves as before apart from the active treatment.
 */

/** Bar height above the safe-area inset. The circle is centered in this band. */
const ROW_HEIGHT = 64;
const CIRCLE = 48;
const ICON = 24;

/** Slight overshoot on arrival - enough to feel alive, not enough to wobble. */
const SPRING = { damping: 16, stiffness: 170, mass: 0.7 };

/** How far the icon lifts when a label is showing beneath it. */
const ICON_LIFT = -7;

/** Parking spot for the indicator when focus is on a hidden route. Any value
 *  more than one slot from every tab works; -2 is safely off the row. */
const OFF_ROW = -2;

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = useState(0);

  // Hidden routes (`href: null`) stay mounted and navigable but must not take a
  // slot. expo-router marks them by setting tabBarItemStyle to display:'none',
  // which is the only signal a custom bar gets - `href` itself is stripped from
  // options before they reach us.
  const items = state.routes
    .map((route, routeIndex) => ({ route, routeIndex }))
    .filter(({ route }) => {
      const itemStyle = StyleSheet.flatten(
        descriptors[route.key].options.tabBarItemStyle as StyleProp<ViewStyle>,
      );
      return itemStyle?.display !== 'none';
    });

  // Position among the *visible* slots, which is what the circle travels across.
  // -1 while focus sits on a hidden route, which stays navigable under `href:
  // null`.
  const activeSlot = items.findIndex(({ routeIndex }) => routeIndex === state.index);

  const progress = useSharedValue(Math.max(activeSlot, 0));

  useEffect(() => {
    if (activeSlot >= 0) {
      progress.value = withSpring(activeSlot, SPRING);
    } else {
      // Parked outside the row so no tab reads as near and every one falls back
      // to icon + label. Without this the last focused tab would keep drawing its
      // active icon in onAccent with the circle now hidden behind it - white on
      // white. Set, not sprung: there is no slot to slide to.
      progress.value = OFF_ROW;
    }
  }, [activeSlot, progress]);

  const slotWidth = items.length > 0 ? rowWidth / items.length : 0;
  const activeTint =
    descriptors[state.routes[state.index].key].options.tabBarActiveTintColor ?? palette.accent;

  const circleStyle = useAnimatedStyle(() => ({
    // Measured on first layout; until then the circle would sit at x=0 under the
    // first tab, so it stays invisible for that frame.
    opacity: slotWidth > 0 && activeSlot >= 0 ? 1 : 0,
    transform: [{ translateX: progress.value * slotWidth + (slotWidth - CIRCLE) / 2 }],
  }));

  // Keeps `tabBarStyle` meaningful now that this bar, not the default one, draws
  // the surface.
  const barStyle = descriptors[state.routes[state.index].key].options.tabBarStyle;

  return (
    <View
      style={[
        {
          backgroundColor: palette.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: palette.border,
        },
        barStyle as StyleProp<ViewStyle>,
        // After tabBarStyle: the inset is this bar's own concern, and a
        // tabBarStyle height would otherwise fight the fixed row.
        { paddingBottom: insets.bottom, height: undefined },
      ]}>
      <View style={styles.row} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
        {/* One shared circle rather than one per tab: a single element sliding
            between slots is what makes the movement continuous. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.circle,
            { backgroundColor: activeTint, shadowColor: activeTint },
            circleStyle,
          ]}
        />

        {items.map(({ route, routeIndex }, slot) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            if (process.env.EXPO_OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TabItem
              key={route.key}
              slot={slot}
              progress={progress}
              isFocused={isFocused}
              label={typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title}
              icon={options.tabBarIcon}
              activeColor={palette.onAccent}
              inactiveColor={options.tabBarInactiveTintColor}
              labelStyle={options.tabBarLabelStyle}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

type TabItemProps = {
  slot: number;
  progress: SharedValue<number>;
  isFocused: boolean;
  label?: string;
  icon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  activeColor: string;
  inactiveColor?: string;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
  onPress: () => void;
  onLongPress: () => void;
};

/**
 * Its own component so the animated-style hooks are per-tab. Mapping hooks over
 * a list inside the bar would break the moment the role switch changes how many
 * tabs are visible.
 */
function TabItem({
  slot,
  progress,
  isFocused,
  label,
  icon,
  activeColor,
  inactiveColor,
  labelStyle,
  accessibilityLabel,
  testID,
  onPress,
  onLongPress,
}: TabItemProps) {
  // Distance from the travelling circle, 0 when it has arrived here. Driving the
  // icon and label off the same value the circle uses keeps them in step with it
  // instead of switching a frame early or late.
  //
  // Marked as a worklet because the useAnimatedStyle callbacks below run on the
  // UI thread, and calling a plain JS function from there throws at runtime.
  const nearness = (value: number) => {
    'worklet';
    return interpolate(Math.abs(value - slot), [0, 1], [1, 0], Extrapolation.CLAMP);
  };

  const iconLiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(nearness(progress.value), [0, 1], [ICON_LIFT, 0]) }],
  }));

  // Cross-fading two copies rather than swapping one icon's color prop:
  // MaterialCommunityIcons takes color as a plain prop, so it cannot be animated
  // directly, and a hard swap mid-slide is visible.
  const activeIconStyle = useAnimatedStyle(() => ({ opacity: nearness(progress.value) }));
  const inactiveIconStyle = useAnimatedStyle(() => ({ opacity: 1 - nearness(progress.value) }));

  const labelAnimStyle = useAnimatedStyle(() => {
    const away = 1 - nearness(progress.value);
    return { opacity: away, transform: [{ translateY: interpolate(away, [0, 1], [4, 0]) }] };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}>
      <Animated.View style={[styles.iconWrap, iconLiftStyle]}>
        <Animated.View style={[styles.iconLayer, activeIconStyle]}>
          {icon?.({ focused: true, color: activeColor, size: ICON })}
        </Animated.View>
        <Animated.View style={[styles.iconLayer, inactiveIconStyle]}>
          {icon?.({ focused: false, color: inactiveColor ?? activeColor, size: ICON })}
        </Animated.View>
      </Animated.View>

      {/* Absolute so the icon stays centered on the circle whether or not a
          label is showing - laying them out in flow would shift the icon as the
          label fades. */}
      <Animated.Text
        numberOfLines={1}
        style={[styles.label, { color: inactiveColor }, labelStyle, labelAnimStyle]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
  },
  circle: {
    position: 'absolute',
    top: (ROW_HEIGHT - CIRCLE) / 2,
    left: 0,
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  item: {
    flex: 1,
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: ICON + 4,
    height: ICON + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    bottom: 8,
    fontSize: 11,
    fontWeight: '600',
  },
});

import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { TC } from "./theme";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

// ─── Constants ───────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get("window").width;
const BAR_MARGIN_H = 24;
const BAR_H = 60;
const TAB_COUNT = 5;
const BAR_W = SCREEN_W - BAR_MARGIN_H * 2;
const TAB_W = BAR_W / TAB_COUNT;

const BUMP_SIZE = 56;
const ACTIVE_SIZE = 46;
const BUMP_LIFT = 24; // how far the bump rises above the bar top

const SPRING = { damping: 14, stiffness: 140, mass: 0.8 };

// Tab config — Home in CENTER (index 2)
const TAB_ICONS: {
  outline: keyof typeof Ionicons.glyphMap;
  filled: keyof typeof Ionicons.glyphMap;
}[] = [
  { outline: "time-outline", filled: "time" },
  { outline: "stats-chart-outline", filled: "stats-chart" },
  { outline: "home-outline", filled: "home" },
  { outline: "notifications-outline", filled: "notifications" },
  { outline: "person-outline", filled: "person" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function NavigationBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const idx = state.index;

  // Animated X center of the active tab
  const activeX = useSharedValue(idx * TAB_W + TAB_W / 2);

  // Pop scale for the active circle
  const popScale = useSharedValue(1);

  React.useEffect(() => {
    activeX.value = withSpring(idx * TAB_W + TAB_W / 2, SPRING);
    popScale.value = withSequence(
      withTiming(0.7, { duration: 80, easing: Easing.out(Easing.ease) }),
      withSpring(1.1, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 180 })
    );
  }, [idx]);

  // ── Animated styles ──

  const bumpStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: activeX.value - BUMP_SIZE / 2 }],
  }));

  const circleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: activeX.value - ACTIVE_SIZE / 2 },
      { scale: popScale.value },
    ],
  }));

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      {/* ── White bump circle (merges with bar top) ── */}
      <Animated.View style={[styles.bump, bumpStyle]} />

      {/* ── Colored active circle ── */}
      <Animated.View style={[styles.activeCircle, circleStyle]}>
        <Ionicons
          name={TAB_ICONS[idx]?.filled ?? "home"}
          size={22}
          color="#FFF"
        />
      </Animated.View>

      {/* ── Bar body ── */}
      <View style={styles.bar}>
        {state.routes.map((route, i) => {
          const isActive = idx === i;
          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={() => {
                if (!isActive) {
                  navigation.navigate(route.name);
                }
              }}
              style={styles.tab}
            >
              {/* Hide icon when it's the active one (it's in the circle) */}
              <Animated.View style={{ opacity: isActive ? 0 : 1 }}>
                <Ionicons
                  name={TAB_ICONS[i]?.outline ?? "ellipse-outline"}
                  size={23}
                  color={TC.navInactive}
                />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: BAR_MARGIN_H,
    right: BAR_MARGIN_H,
    alignItems: "flex-start",
  },

  /* White circle behind active indicator — same color as bar = seamless merge */
  bump: {
    position: "absolute",
    top: 0,
    left: 0,
    width: BUMP_SIZE,
    height: BUMP_SIZE,
    borderRadius: BUMP_SIZE / 2,
    backgroundColor: TC.navBg,
    zIndex: 1,
  },

  /* Colored active circle with icon */
  activeCircle: {
    position: "absolute",
    top: (BUMP_LIFT - ACTIVE_SIZE) / 2 + 2,
    left: 0,
    width: ACTIVE_SIZE,
    height: ACTIVE_SIZE,
    borderRadius: ACTIVE_SIZE / 2,
    backgroundColor: TC.navActive,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    shadowColor: TC.navActive,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },

  /* Main bar body */
  bar: {
    marginTop: BUMP_LIFT,
    height: BAR_H,
    backgroundColor: TC.navBg,
    borderRadius: BAR_H / 2,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.navShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },

  tab: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});

import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { TC } from "./theme";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TAB_ICONS: {
  outline: keyof typeof Ionicons.glyphMap;
  filled: keyof typeof Ionicons.glyphMap;
}[] = [
  { outline: "bag-outline", filled: "bag" },
  { outline: "notifications-outline", filled: "notifications" },
  { outline: "home-outline", filled: "home" },
  { outline: "stats-chart-outline", filled: "stats-chart" },
  { outline: "person-outline", filled: "person" },
];

interface TabButtonProps {
  isActive: boolean;
  iconOutline: keyof typeof Ionicons.glyphMap;
  iconFilled: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

function TabButton({ isActive, iconOutline, iconFilled, onPress }: TabButtonProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      scale.value = withSequence(
        withTiming(0.8, { duration: 80 }),
        withSpring(1.2, { damping: 10, stiffness: 120 }),
        withSpring(1.0, { damping: 12, stiffness: 120 })
      );
    } else {
      scale.value = withTiming(1.0, { duration: 150 });
    }
  }, [isActive]);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.tab}
    >
      <Animated.View style={animatedIconStyle}>
        <Ionicons
          name={isActive ? iconFilled : iconOutline}
          size={24}
          color={isActive ? TC.navActive : TC.navInactive}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function NavigationBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = barWidth / state.routes.length;

  const bubbleStyle = useAnimatedStyle(() => {
    if (barWidth === 0) {
      return { opacity: 0 };
    }
    // Center a 56px wide bubble in the middle of the active tab
    const targetX = state.index * tabWidth + (tabWidth - 56) / 2;
    return {
      opacity: 1,
      transform: [{ translateX: withSpring(targetX, { damping: 15, stiffness: 120 }) }],
    };
  });

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <View
        style={styles.bar}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {barWidth > 0 && (
          <Animated.View style={[styles.bubble, bubbleStyle]} />
        )}
        {state.routes.map((route, i) => {
          const isActive = state.index === i;
          return (
            <TabButton
              key={route.key}
              isActive={isActive}
              iconOutline={TAB_ICONS[i]?.outline}
              iconFilled={TAB_ICONS[i]?.filled}
              onPress={() => {
                if (!isActive) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 24,
    right: 24,
  },
  bar: {
    height: 64,
    backgroundColor: TC.navBg,
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.navShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  bubble: {
    position: "absolute",
    height: 44,
    width: 56,
    borderRadius: 22,
    backgroundColor: TC.accentLight,
    top: 9,
    left: 0,
  },
  tab: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
});

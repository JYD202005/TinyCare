import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TC } from "./theme";

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
  iconSize: number;
  onPress: () => void;
}

function TabButton({
  isActive,
  iconOutline,
  iconFilled,
  iconSize,
  onPress,
}: TabButtonProps) {
  const scale = useSharedValue(isActive ? 1.08 : 1.0);
  const translateY = useSharedValue(isActive ? -2 : 0);
  const opacity = useSharedValue(isActive ? 1.0 : 0.65);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1.08, { damping: 18, stiffness: 240 });
      translateY.value = withSpring(-2, { damping: 18, stiffness: 240 });
      opacity.value = withTiming(1.0, { duration: 160 });
    } else {
      scale.value = withSpring(1.0, { damping: 18, stiffness: 240 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 240 });
      opacity.value = withTiming(0.65, { duration: 160 });
    }
  }, [isActive]);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }, { translateY: translateY.value }],
    };
  });

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.tab}>
      <Animated.View style={animatedIconStyle}>
        <Ionicons
          name={isActive ? iconFilled : iconOutline}
          size={iconSize}
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
  const { width: windowWidth } = useWindowDimensions();
  const isSmall = windowWidth <= 385;
  const bubbleWidth = isSmall ? 48 : 56;
  const bubbleHeight = isSmall ? 38 : 44;
  const barHeight = isSmall ? 56 : 64;
  const horizontalMargin = isSmall ? 14 : 20;
  const barWidthLimit = Math.min(windowWidth - horizontalMargin * 2, 460);

  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = barWidth / state.routes.length;

  const translateX = useSharedValue(0);
  const hasPositioned = useSharedValue(false);

  useEffect(() => {
    if (tabWidth > 0) {
      const targetX = state.index * tabWidth + (tabWidth - bubbleWidth) / 2;
      if (!hasPositioned.value) {
        translateX.value = targetX;
        hasPositioned.value = true;
      } else {
        translateX.value = withSpring(targetX, {
          damping: 24, // Amortiguación crítica: sin sacudidas ni oscilación
          stiffness: 220, // Rápido y fluido
          mass: 0.7, // Movimiento ligero y natural
        });
      }
    }
  }, [state.index, tabWidth, bubbleWidth]);

  const bubbleStyle = useAnimatedStyle(() => {
    return {
      opacity: barWidth === 0 ? 0 : 1,
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View
        style={[
          styles.bar,
          {
            width: barWidthLimit,
            height: barHeight,
            borderRadius: barHeight / 2,
          },
        ]}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {barWidth > 0 && (
          <Animated.View
            style={[
              styles.bubble,
              {
                width: bubbleWidth,
                height: bubbleHeight,
                borderRadius: bubbleHeight / 2,
                top: (barHeight - bubbleHeight) / 2,
              },
              bubbleStyle,
            ]}
          >
            <View style={styles.bubbleAccent} />
          </Animated.View>
        )}
        {state.routes.map((route, i) => {
          const isActive = state.index === i;
          return (
            <TabButton
              key={route.key}
              isActive={isActive}
              iconOutline={TAB_ICONS[i]?.outline}
              iconFilled={TAB_ICONS[i]?.filled}
              iconSize={isSmall ? 21 : 24}
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
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bar: {
    backgroundColor: TC.navBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.navShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
  bubble: {
    position: "absolute",
    backgroundColor: TC.accentLight,
    borderWidth: 1,
    borderColor: TC.accent + "22",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
    shadowColor: TC.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
    left: 0,
  },
  bubbleAccent: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: TC.accent,
  },
  tab: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
});

import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export default function NavigationBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const idx = state.index;

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
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
              <Ionicons
                name={isActive ? TAB_ICONS[i]?.filled : TAB_ICONS[i]?.outline}
                size={26}
                color={isActive ? TC.navActive : TC.navInactive}
              />
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
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
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  tab: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TC.navActive,
    marginTop: 4,
    position: 'absolute',
    bottom: 10,
  }
});

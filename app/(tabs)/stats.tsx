import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TC } from "../../components/theme";

export default function StatsScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <Ionicons name="stats-chart" size={48} color={TC.vitalActivity} />
      </View>
      <Text style={styles.title}>Estadísticas</Text>
      <Text style={styles.sub}>
        Análisis detallados y gráficas del desarrollo de tu bebé.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TC.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 30,
    backgroundColor: TC.vitalActivity + "12",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderCurve: "continuous" as any,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  sub: {
    fontSize: 16,
    fontWeight: "500",
    color: TC.textMuted,
    textAlign: "center",
    lineHeight: 24,
  },
});

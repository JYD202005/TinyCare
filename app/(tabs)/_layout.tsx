import { Tabs } from "expo-router";
import NavigationBar from "../../components/NavegationBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <NavigationBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="store" />
      <Tabs.Screen name="alerts" />
      <Tabs.Screen name="home" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

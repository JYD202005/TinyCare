import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
    Animated,
    LayoutAnimation,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from "react-native";
import { BabyAvatar } from "./BabyAvatar";
import { TC } from "./theme";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface BabyTabItem {
  id: string;
  name: string;
  avatar: string;
  gender: "boy" | "girl";
  connected: boolean;
  deviceId: string | null;
}

export interface DraggableProfileTabsProps {
  babies: BabyTabItem[];
  activeBabyIndex: number;
  onSelectBaby: (index: number) => void;
  onReorderBabies: (newBabies: BabyTabItem[], newActiveIndex?: number) => void;
  onAddPress: () => void;
}

const TAB_ACTIVE_WIDTH = 148;
const TAB_INACTIVE_WIDTH = 48;
const TAB_GAP = 4;
const STEP = TAB_INACTIVE_WIDTH + TAB_GAP; // 52px por ranura

const safeHaptic = (type: "start" | "swap" | "drop") => {
  try {
    if (type === "start") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (type === "swap") {
      Haptics.selectionAsync();
    } else if (type === "drop") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Silencioso en caso de no estar disponible
  }
};

/**
 * Pestaña inactiva: TouchableOpacity puro sin PanResponder.
 * Selección instantánea y fiable, sin solapamientos ni capturas de toques adyacentes.
 */
const InactiveProfileTab: React.FC<{
  baby: BabyTabItem;
  index: number;
  isFirst: boolean;
  onPress: () => void;
}> = React.memo(({ baby, isFirst, onPress }) => {
  const isGirl = baby.gender === "girl";
  const inactiveColor = isGirl ? TC.babyGirlInactive : TC.babyBoyInactive;
  const inactiveBorder = isGirl ? TC.babyGirlBorder : TC.babyBoyBorder;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.folderTab,
        styles.folderTabInactive,
        isFirst && styles.folderTabFirst,
        {
          backgroundColor: inactiveColor,
          borderColor: inactiveBorder,
        },
      ]}
      accessibilityLabel={`Seleccionar perfil de ${baby.name}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: false }}
    >
      <View
        style={[
          styles.tabAvatarFrame,
          styles.tabAvatarFrameInactive,
          { borderColor: inactiveBorder },
        ]}
      >
        <BabyAvatar
          avatar={baby.avatar}
          name={baby.name}
          gender={baby.gender}
          size={30}
        />
      </View>
    </TouchableOpacity>
  );
});

/**
 * Pestaña activa: Única pestaña arrastrable para reordenar perfiles.
 * Muestra avatar centrado, nombre y estado ("Monitoreando").
 */
const ActiveProfileTab: React.FC<{
  baby: BabyTabItem;
  isFirst: boolean;
  isDragging: boolean;
  panX: Animated.Value;
  scaleAnim: Animated.Value;
  panHandlers: any;
}> = React.memo(
  ({ baby, isFirst, isDragging, panX, scaleAnim, panHandlers }) => {
    const isGirl = baby.gender === "girl";
    const activeColor = isGirl ? TC.babyGirlActive : TC.babyBoyActive;

    return (
      <Animated.View
        style={[
          styles.folderTab,
          styles.folderTabActive,
          isFirst && styles.folderTabFirst,
          {
            backgroundColor: activeColor,
            borderColor: "rgba(255, 255, 255, 0.55)",
            shadowColor: activeColor,
            elevation: isDragging ? 14 : 4,
            shadowOpacity: isDragging ? 0.38 : 0.28,
            shadowRadius: isDragging ? 12 : 8,
            zIndex: isDragging ? 9999 : 2,
            transform: [{ translateX: panX }, { scale: scaleAnim }],
          },
        ]}
        {...panHandlers}
        accessibilityLabel={`Perfil activo de ${baby.name}. Desliza horizontalmente para reordenar.`}
        accessibilityRole="tab"
        accessibilityState={{ selected: true }}
      >
        {/* Marco circular del avatar */}
        <View style={[styles.tabAvatarFrame, styles.tabAvatarFrameActive]}>
          <BabyAvatar
            avatar={baby.avatar}
            name={baby.name}
            gender={baby.gender}
            size={30}
          />
        </View>

        {/* Información de texto expandido */}
        <View style={styles.tabInfo}>
          <Text style={styles.tabName} numberOfLines={1}>
            {baby.name}
          </Text>
          <Text style={styles.tabStatus} numberOfLines={1}>
            Monitoreando
          </Text>
        </View>
      </Animated.View>
    );
  },
);

export const DraggableProfileTabs: React.FC<DraggableProfileTabsProps> = ({
  babies,
  activeBabyIndex,
  onSelectBaby,
  onReorderBabies,
  onAddPress,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const panX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const babiesRef = useRef<BabyTabItem[]>(babies);
  babiesRef.current = babies;

  const activeIdxRef = useRef<number>(activeBabyIndex);
  activeIdxRef.current = activeBabyIndex;

  const dragStartSlotRef = useRef<number>(0);
  const currentSlotRef = useRef<number>(0);

  const finishDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    safeHaptic("drop");

    Animated.parallel([
      Animated.spring(panX, {
        toValue: 0,
        friction: 6,
        tension: 130,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 130,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setIsDragging(false);
    });
  }, [panX, scaleAnim]);

  // Solo la viñeta activa posee el PanResponder para reordenar
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Capturar únicamente ante movimiento horizontal deliberado en la viñeta activa
        return (
          Math.abs(gestureState.dx) > 6 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        setIsDragging(true);
        dragStartSlotRef.current = activeIdxRef.current;
        currentSlotRef.current = activeIdxRef.current;
        panX.setValue(0);

        safeHaptic("start");

        Animated.spring(scaleAnim, {
          toValue: 1.07,
          friction: 6,
          tension: 130,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        if (!isDraggingRef.current) return;

        const startSlot = dragStartSlotRef.current;
        let curSlot = currentSlotRef.current;
        const currentList = [...babiesRef.current];
        let didSwap = false;

        // Evaluar swaps a la derecha
        while (curSlot < currentList.length - 1) {
          const slotOffset = (curSlot - startSlot) * STEP;
          const localX = gestureState.dx - slotOffset;
          if (localX > STEP / 2) {
            const temp = currentList[curSlot];
            currentList[curSlot] = currentList[curSlot + 1];
            currentList[curSlot + 1] = temp;
            curSlot += 1;
            didSwap = true;
          } else {
            break;
          }
        }

        // Evaluar swaps a la izquierda
        while (curSlot > 0) {
          const slotOffset = (curSlot - startSlot) * STEP;
          const localX = gestureState.dx - slotOffset;
          if (localX < -STEP / 2) {
            const temp = currentList[curSlot];
            currentList[curSlot] = currentList[curSlot - 1];
            currentList[curSlot - 1] = temp;
            curSlot -= 1;
            didSwap = true;
          } else {
            break;
          }
        }

        if (didSwap) {
          currentSlotRef.current = curSlot;
          babiesRef.current = currentList;
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          safeHaptic("swap");
          onReorderBabies(currentList, curSlot);
        }

        const finalSlotOffset = (curSlot - startSlot) * STEP;
        let targetX = gestureState.dx - finalSlotOffset;

        // Resistencia elástica en los límites
        if (curSlot === 0 && targetX < 0) {
          targetX *= 0.3;
        } else if (curSlot === currentList.length - 1 && targetX > 0) {
          targetX *= 0.3;
        }

        panX.setValue(targetX);
      },
      onPanResponderRelease: () => {
        finishDrag();
      },
      onPanResponderTerminate: () => {
        finishDrag();
      },
    }),
  ).current;

  return (
    <View style={styles.profilesWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!isDragging}
        contentContainerStyle={styles.profilesContainer}
      >
        {babies.map((b, index) => {
          const isActive = index === activeBabyIndex;

          if (isActive) {
            return (
              <ActiveProfileTab
                key={b.id || `active-${index}`}
                baby={b}
                isFirst={index === 0}
                isDragging={isDragging}
                panX={panX}
                scaleAnim={scaleAnim}
                panHandlers={panResponder.panHandlers}
              />
            );
          }

          return (
            <InactiveProfileTab
              key={b.id || `inactive-${index}`}
              baby={b}
              index={index}
              isFirst={index === 0}
              onPress={() => onSelectBaby(index)}
            />
          );
        })}

        {/* Botón de añadir perfil con estilo archivero */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onAddPress}
          style={styles.profileAddBtn}
          accessibilityLabel="Gestionar o agregar perfiles"
        >
          <Ionicons name="add" size={22} color={TC.accent} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  profilesWrapper: {
    marginHorizontal: -16,
    marginBottom: -1,
    zIndex: 10,
  },
  profilesContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
    flexDirection: "row",
    alignItems: "flex-end", // Todas las pestañas se apoyan en la línea base inferior
    gap: TAB_GAP,
  },
  folderTab: {
    flexDirection: "row",
    alignItems: "center",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    overflow: "hidden",
  },
  folderTabFirst: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 0,
  },
  folderTabActive: {
    width: TAB_ACTIVE_WIDTH,
    height: 52,
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 5,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 2,
  },
  folderTabInactive: {
    width: TAB_INACTIVE_WIDTH,
    height: 46,
    paddingHorizontal: 0,
    paddingVertical: 5,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    zIndex: 1,
  },
  tabAvatarFrame: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tabAvatarFrameActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  tabAvatarFrameInactive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabInfo: {
    marginLeft: 7,
    marginRight: 6,
    justifyContent: "center",
    overflow: "hidden",
    flex: 1,
  },
  tabName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  tabStatus: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.88)",
    marginTop: 0.5,
  },
  profileAddBtn: {
    height: 46,
    width: 46,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: TC.inputBorder,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
});

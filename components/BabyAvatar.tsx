import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Image,
    ImageSourcePropType,
    ImageStyle,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { TC } from "./theme";

export interface BabyAvatarInfo {
  id: string;
  label: string;
  gender: "boy" | "girl";
  image: ImageSourcePropType;
}

/** Avatares de Niño (prefijo b-) */
export const BOY_AVATARS: BabyAvatarInfo[] = [
  {
    id: "b-bear",
    label: "Osito",
    gender: "boy",
    image: require("../assets/icons/b-bear.png"),
  },
  {
    id: "b-rocket",
    label: "Cohete",
    gender: "boy",
    image: require("../assets/icons/b-rocket.png"),
  },
  {
    id: "b-cookie",
    label: "Galleta",
    gender: "boy",
    image: require("../assets/icons/b-cookie.png"),
  },
  {
    id: "b-hammer",
    label: "Martillo",
    gender: "boy",
    image: require("../assets/icons/b-hammer.jpg"),
  },
];

/** Avatares de Niña (prefijo g-) */
export const GIRL_AVATARS: BabyAvatarInfo[] = [
  {
    id: "g-bun",
    label: "Conejita",
    gender: "girl",
    image: require("../assets/icons/g-bun.png"),
  },
  {
    id: "g-butterfly",
    label: "Mariposa",
    gender: "girl",
    image: require("../assets/icons/g-butterfly.png"),
  },
  {
    id: "g-crown",
    label: "Corona",
    gender: "girl",
    image: require("../assets/icons/g-crown.jpg"),
  },
  {
    id: "g-muffin",
    label: "Muffin",
    gender: "girl",
    image: require("../assets/icons/g-muffin.jpg"),
  },
];

export const ALL_AVATARS: BabyAvatarInfo[] = [...BOY_AVATARS, ...GIRL_AVATARS];

export const AVATAR_MAP: Record<string, ImageSourcePropType> = {
  "b-bear": require("../assets/icons/b-bear.png"),
  "b-rocket": require("../assets/icons/b-rocket.png"),
  "b-cookie": require("../assets/icons/b-cookie.png"),
  "b-hammer": require("../assets/icons/b-hammer.jpg"),
  "g-bun": require("../assets/icons/g-bun.png"),
  "g-butterfly": require("../assets/icons/g-butterfly.png"),
  "g-crown": require("../assets/icons/g-crown.jpg"),
  "g-muffin": require("../assets/icons/g-muffin.jpg"),
};

/**
 * Determina si el bebé es niño o niña según su avatar o campo sexo/género.
 */
export function getBabyGender(
  avatarKey?: string | null,
  gender?: string | null,
): "boy" | "girl" {
  const isGirl =
    gender?.toLowerCase().includes("fem") ||
    gender?.toLowerCase().includes("niña") ||
    gender?.toLowerCase().includes("girl") ||
    avatarKey?.startsWith("g-") ||
    avatarKey === "👧" ||
    avatarKey === "🎀" ||
    avatarKey === "🌸" ||
    avatarKey === "🦄";

  return isGirl ? "girl" : "boy";
}

/**
 * Obtiene la imagen adecuada para un bebé a partir de su avatarKey o inferido por nombre/género.
 */
export function getBabyAvatarSource(
  avatarKey?: string | null,
  babyName?: string,
  gender?: string,
): ImageSourcePropType {
  if (avatarKey && AVATAR_MAP[avatarKey]) {
    return AVATAR_MAP[avatarKey];
  }

  const isGirl = getBabyGender(avatarKey, gender) === "girl";

  if (isGirl) {
    return AVATAR_MAP["g-bun"];
  }

  return AVATAR_MAP["b-bear"];
}

export function isValidAvatarKey(key?: string | null): boolean {
  return !!key && key in AVATAR_MAP;
}

export interface BabyAvatarProps {
  avatar?: string | null;
  name?: string;
  gender?: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  borderWidth?: number;
  borderColor?: string;
}

/**
 * Componente unificado para mostrar la imagen del bebé sin usar emojis ni iconos genéricos.
 */
export const BabyAvatar: React.FC<BabyAvatarProps> = ({
  avatar,
  name,
  gender,
  size = 36,
  style,
  containerStyle,
  borderWidth,
  borderColor,
}) => {
  const source = getBabyAvatarSource(avatar, name, gender);
  const radius = size / 2;

  return (
    <View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: "#FFF",
          borderWidth: borderWidth ?? 1,
          borderColor: borderColor ?? "rgba(0,0,0,0.06)",
        },
        containerStyle,
      ]}
    >
      <Image
        source={source}
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
          style,
        ]}
        resizeMode="cover"
      />
    </View>
  );
};

export interface BabyAvatarSelectorProps {
  selectedAvatar?: string | null;
  onSelectAvatar: (avatarId: string) => void;
  initialGender?: "boy" | "girl";
}

/**
 * Selector interactivo de avatares con pestañas para Niño y Niña.
 */
export const BabyAvatarSelector: React.FC<BabyAvatarSelectorProps> = ({
  selectedAvatar,
  onSelectAvatar,
  initialGender,
}) => {
  const [activeGender, setActiveGender] = useState<"boy" | "girl">(
    initialGender ?? (selectedAvatar?.startsWith("g-") ? "girl" : "boy"),
  );

  const avatars = activeGender === "boy" ? BOY_AVATARS : GIRL_AVATARS;

  return (
    <View style={styles.selectorContainer}>
      {/* Pestañas de Género */}
      <View style={styles.genderTabs}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.genderTab,
            activeGender === "boy" && styles.genderTabActiveBoy,
          ]}
          onPress={() => setActiveGender("boy")}
        >
          <Ionicons
            name="male"
            size={16}
            color={activeGender === "boy" ? "#FFF" : TC.textBody}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.genderTabText,
              activeGender === "boy" && styles.genderTabTextActive,
            ]}
          >
            Niño
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.genderTab,
            activeGender === "girl" && styles.genderTabActiveGirl,
          ]}
          onPress={() => setActiveGender("girl")}
        >
          <Ionicons
            name="female"
            size={16}
            color={activeGender === "girl" ? "#FFF" : TC.textBody}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.genderTabText,
              activeGender === "girl" && styles.genderTabTextActive,
            ]}
          >
            Niña
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grid de Avatares */}
      <View style={styles.avatarGrid}>
        {avatars.map((item) => {
          const isSelected = selectedAvatar === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => onSelectAvatar(item.id)}
              style={[
                styles.avatarCard,
                isSelected && styles.avatarCardSelected,
              ]}
            >
              <Image
                source={item.image}
                style={styles.avatarImage}
                resizeMode="cover"
              />
              <Text
                style={[
                  styles.avatarLabel,
                  isSelected && styles.avatarLabelSelected,
                ]}
              >
                {item.label}
              </Text>
              {isSelected && (
                <View style={styles.checkBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={TC.accent}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  selectorContainer: {
    backgroundColor: TC.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    marginTop: 8,
  },
  genderTabs: {
    flexDirection: "row",
    backgroundColor: TC.trackBg,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    gap: 6,
  },
  genderTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  genderTabActiveBoy: {
    backgroundColor: "#3B82F6",
  },
  genderTabActiveGirl: {
    backgroundColor: "#EC4899",
  },
  genderTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: TC.textBody,
  },
  genderTabTextActive: {
    color: "#FFF",
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  avatarCard: {
    width: "22%",
    minWidth: 64,
    alignItems: "center",
    padding: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: TC.inputBorder,
    backgroundColor: TC.inputBg,
    position: "relative",
  },
  avatarCardSelected: {
    borderColor: TC.accent,
    backgroundColor: TC.accentLight,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 6,
  },
  avatarLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: TC.textDark,
    textAlign: "center",
  },
  avatarLabelSelected: {
    color: TC.accent,
    fontWeight: "700",
  },
  checkBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FFF",
    borderRadius: 9,
  },
});

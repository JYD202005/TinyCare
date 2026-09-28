import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { TC } from "./theme";

export interface StatusNoticeModalProps {
  visible: boolean;
  onClose: () => void;
  type: "cloud" | "bluetooth" | null;
  session: any;
  activeBaby: {
    id: string;
    name: string;
    connected: boolean;
    deviceId: string | null;
  };
  isSyncing: boolean;
  lastSync?: Date | number | null;
  onAction: (target: "login" | "profile" | "sensor-management") => void;
}

export const StatusNoticeModal: React.FC<StatusNoticeModalProps> = ({
  visible,
  onClose,
  type,
  session,
  activeBaby,
  isSyncing,
  lastSync,
  onAction,
}) => {
  if (!visible || !type) return null;

  const isCloud = type === "cloud";
  const isBle = type === "bluetooth";

  // Cloud State
  const isCloudConnected = !!session;
  // Bluetooth State
  const isBleConnected = activeBaby.connected || activeBaby.name === "Sazed";

  // Derived content
  let iconName: keyof typeof Ionicons.glyphMap = "cloud-offline";
  let iconColor: string = TC.textMuted;
  let iconBg: string = "#F1F5F9";
  let tagText = "MODO LOCAL";
  let tagColor: string = "#D97706";
  let tagBg: string = "#FEF3C7";
  let title = "Modo Local Activo";
  let description =
    "Tus registros de salud se están almacenando únicamente en este teléfono. Inicia sesión con tu cuenta para respaldar la información de tus bebés en la nube y acceder desde otros dispositivos.";
  let primaryBtnText = "Iniciar Sesión";
  let actionTarget: "login" | "profile" | "sensor-management" = "login";

  if (isCloud) {
    if (isCloudConnected) {
      iconName = "cloud-done";
      iconColor = TC.accent;
      iconBg = TC.accentLight;
      tagText = "NUBE SINCRONIZADA";
      tagColor = TC.accent;
      tagBg = TC.accentLight;
      title = isSyncing
        ? "Sincronizando con la Nube..."
        : "Nube Activa y Segura";
      const userEmail = session.user?.email || "Usuario autenticado";
      description = `Tu cuenta está vinculada a ${userEmail}. Las métricas y reportes biométricos se respaldan de manera automática y cifrada.`;
      primaryBtnText = "Ver Perfil y Ajustes";
      actionTarget = "profile";
    }
  } else if (isBle) {
    if (isBleConnected) {
      iconName = "bluetooth";
      iconColor = TC.accent;
      iconBg = TC.accentLight;
      tagText = "SENSOR EN LÍNEA";
      tagColor = TC.accent;
      tagBg = TC.accentLight;
      title = "Monitor Vinculado";
      description = `El sensor TinyCare de ${activeBaby.name} está conectado y transmitiendo biometría en vivo (ritmo cardíaco, oxigenación y temperatura).`;
      primaryBtnText = "Gestionar Sensores";
      actionTarget = "sensor-management";
    } else {
      iconName = "bluetooth";
      iconColor = TC.vitalHeart;
      iconBg = TC.vitalHeart + "15";
      tagText = "ACCION PENDIENTE";
      tagColor = TC.vitalHeart;
      tagBg = TC.vitalHeart + "15";
      title = "Sensor Desconectado";
      description = `No se reciben lecturas de signos vitales para ${activeBaby.name}. Verifica que el monitor esté encendido, cargado y dentro del rango Bluetooth de este teléfono.`;
      primaryBtnText = "Vincular o Reconectar";
      actionTarget = "sensor-management";
    }
  }

  const handleAction = () => {
    onClose();
    onAction(actionTarget);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={styles.modalCard}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top Row: Icon badge + Close button */}
          <View style={styles.headerRow}>
            <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
              <Ionicons name={iconName} size={24} color={iconColor} />
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Cerrar aviso"
            >
              <Ionicons name="close" size={20} color={TC.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Status Tag */}
          <View style={[styles.statusTag, { backgroundColor: tagBg }]}>
            <View style={[styles.statusDot, { backgroundColor: tagColor }]} />
            <Text style={[styles.statusTagText, { color: tagColor }]}>
              {tagText}
            </Text>
          </View>

          {/* Title & Description */}
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.descText}>{description}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                !isCloudConnected && isCloud
                  ? styles.primaryBtnAmber
                  : !isBleConnected && isBle
                    ? styles.primaryBtnAlert
                    : styles.primaryBtnAccent,
              ]}
              activeOpacity={0.8}
              onPress={handleAction}
            >
              <Text style={styles.primaryBtnText}>{primaryBtnText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <Text style={styles.secondaryBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: TC.card,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TC.trackBg,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 19,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  descText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: TC.textBody,
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 8,
  },
  primaryBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnAccent: {
    backgroundColor: TC.accent,
  },
  primaryBtnAlert: {
    backgroundColor: TC.vitalHeart,
  },
  primaryBtnAmber: {
    backgroundColor: "#F59E0B",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryBtn: {
    width: "100%",
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TC.trackBg,
  },
  secondaryBtnText: {
    color: TC.textBody,
    fontSize: 13.5,
    fontWeight: "600",
  },
});

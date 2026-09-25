import { StyleSheet } from "react-native";
import { TC } from "./theme";

/**
 * Calcula un padding top unificado y seguro para todas las pantallas.
 * Garantiza que tanto en Web (donde insets.top = 0), como en Android
 * o iPhones con notch/isla dinámica, el contenido comience exactamente
 * a la misma distancia estética del borde superior.
 */
export function getScreenTopPadding(insetsTop: number = 0): number {
  return Math.max(insetsTop, 24) + 16;
}

/**
 * Carta de estilos tipográficos estandarizados para TinyCare.
 * Importar en las pantallas principales para garantizar jerarquía visual idéntica.
 */
export const Typography = StyleSheet.create({
  /** Eyebrow / Kicker superior en mayúsculas (ej: "HOLA DE NUEVO,", "EXPEDIENTE TELEMÉTRICO") */
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: TC.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  /** Título principal de pantalla (ej: "Panel de Salud", "Análisis Clínico", "Perfil") */
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.6,
  },
  /** Título de secciones dentro de la pantalla (ej: "Mis Bebés", "General", "Detalles") */
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  /** Subtítulos o descripciones secundarias */
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: TC.textBody,
    lineHeight: 18,
  },
  /** Textos pequeños de pie o etiquetas de estado */
  caption: {
    fontSize: 11,
    fontWeight: "500",
    color: TC.textMuted,
  },
});

/**
 * Carta de estilos de contenedores y layouts comunes.
 */
export const SharedStyles = StyleSheet.create({
  /** Contenedor raíz de toda la pantalla */
  screenRoot: {
    flex: 1,
    backgroundColor: TC.bg,
  },
  /** Contenedor de ScrollView centrado para pantallas móviles y escritorios */
  screenScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  /** Encabezado estándar con soporte de flex-row para botones a la derecha */
  screenHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  /** Superficie de tarjeta estándar con bordes continuos y sombra sutil */
  card: {
    backgroundColor: TC.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderCurve: "continuous" as any,
  },
  /** Superficie de tarjeta compacta */
  cardCompact: {
    backgroundColor: TC.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    borderCurve: "continuous" as any,
  },
  /** Carrusel horizontal de selección de perfiles de bebés */
  profilesWrapper: {
    marginHorizontal: -16,
    marginBottom: 14,
  },
  profilesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    gap: 10,
  },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TC.card,
    padding: 5,
    paddingRight: 14,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: TC.inputBorder,
    shadowColor: TC.textDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    height: 50,
  },
  profilePillActive: {
    backgroundColor: TC.vitalHeart,
    borderColor: TC.vitalHeart,
    shadowColor: TC.vitalHeart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  profileEmojiBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TC.trackBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  profileEmojiBoxActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  profileEmoji: {
    fontSize: 18,
  },
  profileInfo: {
    justifyContent: "center",
  },
  profileName: {
    fontSize: 14,
    fontWeight: "800",
    color: TC.textDark,
    letterSpacing: -0.3,
  },
  profileNameActive: {
    color: "#FFF",
  },
  profileStatus: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginTop: 1,
  },
  profileAddBtn: {
    justifyContent: "center",
    alignItems: "center",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: TC.card,
    borderWidth: 1.5,
    borderColor: TC.inputBorder,
    borderStyle: "dashed",
    marginLeft: 2,
  },
  profileAddIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});

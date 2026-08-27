/**
 * Shared design tokens for TinyCare.
 * Import this in every component/screen to keep colors consistent.
 *
 * Usage:
 *   import { TC } from '../components/theme';
 *   style={{ color: TC.accent }}
 */
export const TC = {

  // ── 🎨 Primarios ──────────────────────────────────────────────────────────
  /** Rosa/coral suave — inicio del gradiente principal */
  gradientStart: '#FB7185',
  /** Azul-menta suave — fin del gradiente principal */
  gradientEnd: '#cce3f5',
  /** Teal clínico — color de acento principal (botones, íconos activos, sombras) */
  accent: '#14B8A6',
  /** Teal muy claro — rellenos y fondos sutiles */
  accentLight: '#E6F7F6',

  // ── 🖥️ Fondos / Superficies ──────────────────────────────────────────────
  /** Crema suave — fondo general de la app */
  bg: '#FAF9F6',
  /** Blanco puro — tarjetas, nav bar */
  card: '#FFFFFF',
  /** Slate 50 — fondo de inputs */
  inputBg: '#F8FAFC',
  /** Slate 100 — fondos de pistas/tracks, separadores */
  trackBg: '#F1F5F9',
  /** Slate 200 — bordes de inputs, separadores suaves */
  inputBorder: '#E2E8F0',
  /** Gris muy claro — bordes de listas */
  borderLight: '#F3F4F6',

  // ── ✏️ Textos ─────────────────────────────────────────────────────────────
  /** Charcoal — texto principal, títulos */
  textDark: '#1E293B',
  /** Slate 600 — texto de cuerpo */
  textBody: '#475569',
  /** Slate 400 — texto secundario/atenuado */
  textMuted: '#94A3B8',
  /** Gris placeholder — offline / deshabilitados */
  textDisabled: '#9CA3AF',

  // ── 💓 Signos Vitales ─────────────────────────────────────────────────────
  /** Rojo-coral — frecuencia cardíaca */
  vitalHeart: '#F43F5E',
  /** Cyan/Sky — SpO2 / oxigenación */
  vitalOxygen: '#0EA5E9',
  /** Amber — temperatura */
  vitalTemp: '#F59E0B',
  /** Morado — actividad */
  vitalActivity: '#8B5CF6',

  // ── 🟢 Éxito / Success ────────────────────────────────────────────────────
  /** Verde éxito — fondo de toast success */
  successBg: '#F0FDF4',
  /** Verde éxito — borde de toast success */
  successBorder: '#4ADE80',
  /** Verde éxito — ícono de toast success */
  successIcon: '#22C55E',
  /** Verde éxito — texto de toast success */
  successText: '#166534',
  /** Verde emerald — checkmarks, selección activa */
  successAccent: '#10B981',
  /** Verde emerald claro — fondo de elemento seleccionado */
  successAccentBg: '#ECFDF5',
  /** Verde emerald muy claro — fondo de badge */
  successAccentBadge: '#D1FAE5',
  /** Verde oscuro — texto sobre fondo éxito */
  successDark: '#065F46',

  // ── ⚠️ Advertencia / Warning ──────────────────────────────────────────────
  /** Amber claro — fondo de toast warning */
  warningBg: '#FFFBEB',
  /** Amber — borde de toast warning */
  warningBorder: '#FCD34D',
  /** Amber oscuro — texto de toast warning */
  warningText: '#92400E',
  /** Amber — ícono de alerta/notificación */
  warningIcon: '#F59E0B',
  /** Amber muy claro — fondo de ícono de notificaciones */
  warningIconBg: '#FEF9EB',

  // ── 🔴 Error / Danger ─────────────────────────────────────────────────────
  /** Rojo claro — fondo de toast error */
  errorBg: '#FFF1F2',
  /** Rojo — borde de toast error */
  errorBorder: '#FCA5A5',
  /** Rojo — ícono de toast error */
  errorIcon: '#EF4444',
  /** Rojo oscuro — texto de toast error */
  errorText: '#991B1B',
  /** Rojo muy claro — fondo de banner de alerta crítica */
  errorBannerBg: '#FEE2E2',
  /** Rojo oscuro — texto de banner crítico */
  errorBannerText: '#B91C1C',
  /** Rojo claro — fondo de ícono de alerta */
  errorIconBg: '#FEF2F2',

  // ── 🔵 Info / Azul ────────────────────────────────────────────────────────
  /** Indigo — notificaciones de tipo info */
  infoPrimary: '#6366F1',
  /** Indigo claro — fondo de ícono info */
  infoBg: '#EEF2FF',
  /** Azul — loading spinner, elementos secundarios */
  blue: '#3B82F6',
  /** Azul claro — gradientes secundarios */
  blueLight: '#93C5FD',
  /** Azul cielo — gradientes de datos de dispositivo */
  skyBlue: '#64B5F6',
  /** Azul marino — gradiente de dispositivo */
  navyBlue: '#1976D2',

  // ── 🌸 Pink / DashboardCard2 ──────────────────────────────────────────────
  /** Pink oscuro — color primario de DashboardCard2 */
  pink: '#C8185A',
  /** Pink claro — gradiente secundario de DashboardCard2 */
  pinkLight: '#E8407A',
  /** Rosa muy claro — fondo de iconos de tipo "bebé" */
  pinkBg: '#FCE7F3',
  /** Gris claro — fondo de pista en DashboardCard2 */
  grayTrack: '#F0F0F5',
  /** Gris muy claro — bordes de separación en DashboardCard2 */
  grayBorderLight: '#F5F5F8',

  // ── 🧭 Navegación ─────────────────────────────────────────────────────────
  /** Fondo de barra de navegación */
  navBg: '#FFFFFF',
  /** Ícono activo en nav bar */
  navActive: '#14B8A6',
  /** Ícono inactivo en nav bar */
  navInactive: '#94A3B8',
  /** Sombra de nav bar */
  navShadow: '#E2E8F0',

  // ── 🌈 Store / Gradientes adicionales ────────────────────────────────────
  /** Amber-naranja — gradiente de temperatura en store */
  tempGradientEnd: '#FFB74D',
  /** Morado claro — gradiente de actividad en store */
  activityGradientEnd: '#7E57C2',
  /** Verde emerald — gradiente de premium/disponible */
  emeraldLight: '#34D399',

  // ── 🔧 Misceláneos ────────────────────────────────────────────────────────
  /** Teal — sombra de botones activos */
  shadow: '#14B8A6',
  /** Teal — estado de checkmark */
  checkmark: '#14B8A6',
  /** Switch off — fondo del track */
  switchOff: '#E5E7EB',
  /** Switch off — thumb desactivado */
  switchThumbOff: '#D1D5DB',
  /** Slate oscuro — íconos genéricos */
  iconGeneric: '#4A5568',
  /** Negro puro — sombras de sistema */
  black: '#000000',

  // ── 📱 Redes Sociales ─────────────────────────────────────────────────────
  socialGoogle: '#EA4335',
  socialFacebook: '#4267B2',
  socialTwitter: '#1DA1F2',

} as const;

/** Tipo inferido de todas las claves del tema */
export type TCKey = keyof typeof TC;


/**
 * Shared design tokens for TinyCare auth screens.
 * Import this in every auth component to keep colors consistent.
 */
export const TC = {
  /* ── Core gradient pair ── */
  gradientStart: '#FB7185',   // soft pink / rose
  gradientEnd: '#cce3f5',     // soft teal / mint

  /* ── Accent from gradient ── */
  accent: '#14B8A6',          // Teal Clínico Activo
  accentLight: '#E6F7F6',     // Very light teal for subtle fills

  /* ── Surfaces ── */
  bg: '#FAF9F6',              // Warm Crema Suave
  card: '#FFFFFF',            // White cards
  inputBg: '#F8FAFC',         // Slate 50 tint
  inputBorder: '#E2E8F0',     // Slate 200 border

  /* ── Text ── */
  textDark: '#1E293B',        // Charcoal Slate (slate 800)
  textBody: '#475569',        // Slate 600
  textMuted: '#94A3B8',       // Slate 400

  /* ── Vital Signs ── */
  vitalHeart: '#F43F5E',      // Coral Rose for heart rate
  vitalOxygen: '#0EA5E9',     // Cyan/Sky blue for SpO2
  vitalTemp: '#F59E0B',       // Amber for temp
  vitalActivity: '#8B5CF6',   // Purple for activity
  trackBg: '#F1F5F9',         // slate 100 for track backgrounds

  /* ── Navigation Bar ── */
  navBg: '#FFFFFF',           // white bar
  navActive: '#14B8A6',       // primary teal active
  navInactive: '#94A3B8',     // slate 400 inactive
  navShadow: '#E2E8F0',       // slate 200 shadow

  /* ── Misc ── */
  shadow: '#14B8A6',          // teal shadow for active buttons
  checkmark: '#14B8A6',       // checked state
  socialGoogle: '#EA4335',
  socialFacebook: '#4267B2',
  socialTwitter: '#1DA1F2',
} as const;

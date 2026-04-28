/**
 * Shared design tokens for TinyCare auth screens.
 * Import this in every auth component to keep colors consistent.
 */
export const TC = {
  /* ── Core gradient pair ── */
  gradientStart: '#FBB4B2',   // warm pink pastel
  gradientEnd: '#A8D4F0',     // soft sky blue

  /* ── Accent from gradient ── */
  accent: '#F4847E',          // slightly saturated pink for links/badges
  accentLight: '#FDDCDB',     // very light pink for subtle fills

  /* ── Surfaces ── */
  bg: '#FFF9F8',              // warm crema background
  card: '#FFFFFF',            // white cards
  inputBg: '#FAFAFA',         // very light warm gray for inputs
  inputBorder: '#F0E6E5',     // warm pink-tinted border

  /* ── Text ── */
  textDark: '#3D2C2E',        // warm dark brown (headings)
  textBody: '#6B5558',        // warm medium brown (body)
  textMuted: '#A8898C',       // warm light brown (placeholders/secondary)

  /* ── Misc ── */
  shadow: '#F4847E',          // pink shadow for buttons
  checkmark: '#F4847E',       // checked state
  socialGoogle: '#EA4335',
  socialFacebook: '#4267B2',
  socialTwitter: '#1DA1F2',
} as const;

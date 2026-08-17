import { Platform } from 'react-native';

export const colors = {
  primary:        '#00E676',   // phosphor green
  primaryDim:     '#00843D',   // medium green
  primaryDark:    '#003D1E',   // dark green border
  secondary:      '#00FFFF',   // cyan accent
  background:     '#000000',   // pure black
  surface:        '#080808',
  surfaceVariant: '#0D0D0D',
  card:           '#0A0A0A',
  cardBorder:     '#002B12',
  text:           '#00E676',   // main terminal green
  textSecondary:  '#00843D',
  textMuted:      '#004D25',
  userBubble:     '#001A0A',
  userBubbleText: '#CCFFCC',
  aiBubble:       '#000A04',
  aiBubbleText:   '#00E676',
  inputBg:        '#000A04',
  inputBorder:    '#00843D',
  error:          '#FF3333',
  success:        '#00E676',
  warning:        '#FFB300',
  divider:        '#002B12',
  icon:           '#00843D',
  iconActive:     '#00E676',
};

export const fonts = {
  mono: Platform.select({ ios: 'Courier New', android: 'monospace' }) ?? 'monospace',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const fontSizes = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const borderRadius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  full: 999,
};

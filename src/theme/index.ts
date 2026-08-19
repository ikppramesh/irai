import { Platform } from 'react-native';

export const colors = {
  primary:        '#7C4DFF',   // deep purple A400
  primaryDim:     '#651FFF',   // deep purple A700
  primaryDark:    '#2A2A45',   // purple-tinted border/divider
  secondary:      '#00BCD4',   // cyan for multi-agent mode
  background:     '#0D0D1A',   // deep dark with purple tint
  surface:        '#131320',
  surfaceVariant: '#1C1C30',
  card:           '#181828',
  cardBorder:     '#2A2A45',
  text:           '#E8E8FF',   // cool off-white
  textSecondary:  '#9090BB',
  textMuted:      '#4A4A70',
  userBubble:     '#1E1840',
  userBubbleText: '#E8E8FF',
  aiBubble:       'transparent',
  aiBubbleText:   '#E8E8FF',
  inputBg:        '#181828',
  inputBorder:    '#2A2A45',
  error:          '#FF5252',
  success:        '#69F0AE',
  warning:        '#FFD740',
  divider:        '#222240',
  icon:           '#6060AA',
  iconActive:     '#7C4DFF',
};

export const fonts = {
  sans: Platform.select({ ios: 'System', android: 'sans-serif' }) ?? 'System',
  sansMedium: Platform.select({ ios: 'System', android: 'sans-serif-medium' }) ?? 'System',
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
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

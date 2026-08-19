import { Platform } from 'react-native';

// Claude-inspired warm, neutral dark palette with a clay/terracotta accent.
export const colors = {
  primary:        '#D97757',   // clay / terracotta accent
  primaryDim:     '#C2694A',   // darker accent for pressed/secondary states
  primaryDark:    '#3A3836',   // neutral border / divider tone
  secondary:      '#7FA7D9',   // muted blue, used for multi-agent mode
  background:     '#1B1A19',   // warm near-black
  surface:        '#211F1E',
  surfaceVariant: '#2A2826',
  card:           '#242220',
  cardBorder:     '#3A3836',
  text:           '#F3F1EA',   // warm off-white
  textSecondary:  '#B7B4AC',
  textMuted:      '#7C7A74',
  userBubble:     '#2E2C2A',
  userBubbleText: '#F3F1EA',
  aiBubble:       'transparent',
  aiBubbleText:   '#F3F1EA',
  inputBg:        '#242220',
  inputBorder:    '#3A3836',
  error:          '#E5484D',
  success:        '#4CAF7D',
  warning:        '#E8A33D',
  divider:        '#33312F',
  icon:           '#8C8A83',
  iconActive:     '#D97757',
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
  md: 6,
  lg: 8,
  xl: 10,
  full: 999,
};

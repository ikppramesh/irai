import { Platform } from 'react-native';

// Batman — satin black + gold
export const colors = {
  primary:        '#FFB300',   // Batman gold / amber
  primaryDim:     '#CC8800',   // darker gold for pressed states
  primaryDark:    '#2A2200',   // near-black gold for borders
  secondary:      '#1565C0',   // Batman dark blue
  background:     '#0F0F0F',   // satin black
  surface:        '#161616',
  surfaceVariant: '#1E1E1E',
  card:           '#1A1A1A',
  cardBorder:     '#282828',
  text:           '#E8E8E8',   // near-white
  textSecondary:  '#909090',
  textMuted:      '#484848',
  userBubble:     '#1C1800',   // very dark amber
  userBubbleText: '#F5E6C8',
  aiBubble:       'transparent',
  aiBubbleText:   '#E8E8E8',
  inputBg:        '#1A1A1A',
  inputBorder:    '#282828',
  error:          '#FF3D00',
  success:        '#69F0AE',
  warning:        '#FFB300',
  divider:        '#222222',
  icon:           '#606060',
  iconActive:     '#FFB300',
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

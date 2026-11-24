/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0D1F23',
    background: '#AFB3B7',
    backgroundElement: '#F4F6F7',
    backgroundSelected: '#69818D',
    textSecondary: '#5A636A',
  },
  dark: {
    text: '#F5F7F8',
    background: '#0D1F23',
    backgroundElement: '#132E35',
    backgroundSelected: '#2D4A53',
    textSecondary: '#AFB3B7',
  },
} as const;

/** Palette supplied for the Restaurante App visual system. */
export const AppColors = {
  night: '#0D1F23',
  deep: '#132E35',
  ocean: '#2D4A53',
  mist: '#69818D',
  silver: '#AFB3B7',
  slate: '#5A636A',
  white: '#F5F7F8',
  transparentSilver: 'rgba(175, 179, 183, 0.13)',
  transparentWhite: 'rgba(245, 247, 248, 0.08)',
  transparentDark: 'rgba(13, 31, 35, 0.48)',
  success: '#B7D5C9',
  danger: '#E9B5B5',
} as const;

export const AppRadii = {
  input: 20,
  button: 24,
  card: 32,
  pill: 999,
  avatar: 999,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

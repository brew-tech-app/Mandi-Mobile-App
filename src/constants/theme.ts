import {
  fontScale,
  responsiveSpacing,
  moderateScale,
  getResponsiveValue,
} from '../utils/responsive';

/**
 * Color palette for the app - Grain Ledger Theme
 */
export const Colors = {
  primary: '#5B4FE8',
  primaryDark: '#4338CA',
  primaryLight: '#7C3AED',
  secondary: '#FF6F00',
  secondaryDark: '#E65100',
  secondaryLight: '#FF9800',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  error: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#1976D2',
  textPrimary: '#212121',
  textSecondary: '#757575',
  textLight: '#FFFFFF',
  border: '#E5E7EB',
  disabled: '#BDBDBD',
  buy: '#F59E0B',
  sell: '#22C55E',
  lend: '#EF4444',
  expense: '#A855F7',
  blue: '#3B82F6',
  purple: '#A855F7',
  gradient: ['#5B4FE8', '#7C3AED'],
};

/**
 * Typography - Responsive font sizes
 */
export const Typography = {
  h1: {
    fontSize: fontScale(32),
    fontWeight: 'bold' as const,
    color: Colors.textPrimary,
  },
  h2: {
    fontSize: fontScale(28),
    fontWeight: 'bold' as const,
    color: Colors.textPrimary,
  },
  h3: {
    fontSize: fontScale(24),
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  h4: {
    fontSize: fontScale(20),
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  body1: {
    fontSize: fontScale(16),
    color: Colors.textPrimary,
  },
  body2: {
    fontSize: fontScale(14),
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: fontScale(12),
    color: Colors.textSecondary,
  },
  button: {
    fontSize: fontScale(16),
    fontWeight: '600' as const,
  },
};

/**
 * Spacing - Responsive spacing values
 */
export const Spacing = {
  xs: responsiveSpacing(4),
  sm: responsiveSpacing(8),
  md: responsiveSpacing(16),
  lg: responsiveSpacing(24),
  xl: responsiveSpacing(32),
  xxl: responsiveSpacing(48),
};

/**
 * Border Radius - Responsive border radius
 */
export const BorderRadius = {
  sm: moderateScale(4, 0.2),
  md: moderateScale(8, 0.2),
  lg: moderateScale(12, 0.2),
  xl: moderateScale(16, 0.2),
  round: 999,
};

/**
 * Shadow
 */
export const Shadow = {
  small: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

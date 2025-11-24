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
 * Typography
 */
export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: Colors.textPrimary,
  },
  h2: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.textPrimary,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  body1: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  body2: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
};

/**
 * Spacing
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/**
 * Border Radius
 */
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
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

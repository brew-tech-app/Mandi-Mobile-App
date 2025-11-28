import {Dimensions, PixelRatio, Platform} from 'react-native';

// Get screen dimensions
const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// Base dimensions (design is based on iPhone 11 Pro - 375x812)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Scale size based on screen width
 * @param size - The base size to scale
 * @returns Scaled size
 */
export const scale = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Scale size based on screen height
 * @param size - The base size to scale
 * @returns Scaled size based on height
 */
export const verticalScale = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Moderate scale - less aggressive scaling
 * @param size - The base size to scale
 * @param factor - Scaling factor (0 = no scale, 1 = full scale)
 * @returns Moderately scaled size
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

/**
 * Responsive font size based on screen width and pixel density
 * @param size - Base font size
 * @returns Scaled font size
 */
export const fontScale = (size: number): number => {
  const newSize = scale(size);
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

/**
 * Get responsive spacing
 * @param size - Base spacing
 * @returns Scaled spacing
 */
export const responsiveSpacing = (size: number): number => {
  return moderateScale(size, 0.3);
};

/**
 * Device size categories
 */
export const isSmallDevice = SCREEN_WIDTH < 375;
export const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeDevice = SCREEN_WIDTH >= 414;

/**
 * Device orientation
 */
export const isLandscape = SCREEN_WIDTH > SCREEN_HEIGHT;
export const isPortrait = SCREEN_HEIGHT > SCREEN_WIDTH;

/**
 * Screen dimensions
 */
export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;

/**
 * Safe dimensions for content (considering notches, etc.)
 */
export const safeWidth = SCREEN_WIDTH * 0.9;
export const safeHeight = SCREEN_HEIGHT * 0.9;

/**
 * Get responsive value based on device size
 * @param small - Value for small devices
 * @param medium - Value for medium devices
 * @param large - Value for large devices
 * @returns Appropriate value based on device size
 */
export const getResponsiveValue = <T,>(
  small: T,
  medium: T,
  large: T
): T => {
  if (isSmallDevice) return small;
  if (isMediumDevice) return medium;
  return large;
};

/**
 * Percentage of screen width
 * @param percentage - Percentage value (0-100)
 * @returns Width value
 */
export const widthPercentage = (percentage: number): number => {
  return (SCREEN_WIDTH * percentage) / 100;
};

/**
 * Percentage of screen height
 * @param percentage - Percentage value (0-100)
 * @returns Height value
 */
export const heightPercentage = (percentage: number): number => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

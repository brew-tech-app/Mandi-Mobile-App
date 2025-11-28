# Responsive Design System

## Overview
The Mandi Mobile App now features a comprehensive responsive design system that automatically adjusts the UI based on screen size and device dimensions. This ensures a consistent and optimal user experience across different Android devices.

## Key Features

### 1. **Responsive Utilities** (`src/utils/responsive.ts`)

#### Scaling Functions
- **`scale(size)`** - Scales size based on screen width
- **`verticalScale(size)`** - Scales size based on screen height  
- **`moderateScale(size, factor)`** - Less aggressive scaling with adjustable factor (default 0.5)
- **`fontScale(size)`** - Platform-specific font scaling with pixel ratio adjustment

#### Spacing & Dimensions
- **`responsiveSpacing(size)`** - Responsive spacing values (factor 0.3)
- **`widthPercentage(percent)`** - Get percentage of screen width
- **`heightPercentage(percent)`** - Get percentage of screen height

#### Device Categories
- **`isSmallDevice`** - Screen width < 375px
- **`isMediumDevice`** - Screen width 375-414px
- **`isLargeDevice`** - Screen width >= 414px

#### Helper Functions
- **`getResponsiveValue(small, medium, large)`** - Returns appropriate value based on device size
- **`screenWidth`** & **`screenHeight`** - Current screen dimensions
- **`safeWidth`** & **`safeHeight`** - Safe area dimensions (90% of screen)

### 2. **Responsive Hook** (`src/hooks/useResponsive.ts`)

The `useResponsive` hook provides real-time dimension updates:

```typescript
const {width, height, isSmallDevice, isLargeDevice, isLandscape} = useResponsive();
```

Features:
- Listens to orientation changes
- Updates dimensions dynamically
- Provides device size classification
- Detects landscape/portrait mode

### 3. **Updated Theme System** (`src/constants/theme.ts`)

#### Typography
All font sizes now use `fontScale()`:
- h1: 32px → responsive
- h2: 28px → responsive
- h3: 24px → responsive
- h4: 20px → responsive
- body1: 16px → responsive
- body2: 14px → responsive
- caption: 12px → responsive

#### Spacing
All spacing values now use `responsiveSpacing()`:
- xs: 4px → responsive
- sm: 8px → responsive
- md: 16px → responsive
- lg: 24px → responsive
- xl: 32px → responsive
- xxl: 48px → responsive

#### Border Radius
Uses `moderateScale()` with factor 0.2:
- sm: 4px → responsive
- md: 8px → responsive
- lg: 12px → responsive
- xl: 16px → responsive

### 4. **Responsive Components**

All core components have been updated with responsive sizing:

#### SummaryCard
- Responsive border width
- Minimum height scales with screen size
- Maintains aspect ratio

#### TransactionCard
- Responsive type indicator width
- Minimum height adjustment
- Touch targets sized appropriately

#### FloatingActionButton (FAB)
- FAB size: 50-60px based on device
- Menu item size: 42-52px based on device
- Responsive icon sizes
- Adaptive spacing

#### CustomButton
- Minimum height: 48px (responsive)
- Responsive border width
- Touch-friendly sizing

#### CustomInput
- Minimum height: 48px (responsive)
- Responsive border width
- Accessible input fields

## Base Design Reference

The responsive system is calibrated to:
- **Base Width:** 375px (iPhone 11 Pro)
- **Base Height:** 812px (iPhone 11 Pro)

All scaling calculations use these as reference points.

## Usage Examples

### Using Responsive Utilities

```typescript
import {scale, moderateScale, getResponsiveValue} from '../utils/responsive';

const styles = StyleSheet.create({
  container: {
    padding: moderateScale(16), // Adapts to screen size
    width: scale(300), // Scales proportionally
  },
  text: {
    fontSize: getResponsiveValue(14, 16, 18), // Different sizes per device
  },
});
```

### Using Responsive Hook

```typescript
import {useResponsive} from '../hooks/useResponsive';

const MyComponent = () => {
  const {width, isSmallDevice, isLandscape} = useResponsive();
  
  return (
    <View style={{
      flexDirection: isLandscape ? 'row' : 'column',
      padding: isSmallDevice ? 8 : 16,
    }}>
      {/* Content */}
    </View>
  );
};
```

### Using Updated Theme

```typescript
import {Typography, Spacing, BorderRadius} from '../constants/theme';

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md, // Already responsive
    borderRadius: BorderRadius.lg, // Already responsive
  },
  title: {
    ...Typography.h3, // Already responsive font size
  },
});
```

## Benefits

1. **Consistency** - Uniform appearance across devices
2. **Accessibility** - Appropriately sized touch targets
3. **Readability** - Optimal font sizes for different screens
4. **Future-proof** - Easily adaptable to new device sizes
5. **Performance** - Calculations done once at initialization
6. **Maintainability** - Centralized scaling logic

## Device Testing

The app has been optimized for:
- Small phones (< 375px width)
- Medium phones (375-414px width)
- Large phones (>= 414px width)
- Portrait and landscape orientations

## Migration Notes

Existing screens will automatically benefit from the responsive theme system. For custom styles, gradually adopt responsive utilities:

1. Replace fixed font sizes with `fontScale()`
2. Replace fixed spacing with `responsiveSpacing()` or theme `Spacing` values
3. Use `moderateScale()` for dimensions
4. Use `getResponsiveValue()` for device-specific values
5. Implement `useResponsive()` hook for dynamic layouts

## Performance Considerations

- Dimension calculations are cached
- Hook uses optimized state updates
- Event listeners properly cleaned up
- No unnecessary re-renders

## Accessibility

The responsive system ensures:
- Minimum touch target size of 48x48 dp
- Readable font sizes across devices
- Adequate spacing for interaction
- Proper contrast maintained at all scales

---

**Note:** The responsive system is now active across all components and screens. Continue to use the centralized theme values for consistency.

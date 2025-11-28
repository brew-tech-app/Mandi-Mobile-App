import React from 'react';
import {Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle} from 'react-native';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';
import {moderateScale} from '../utils/responsive';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Custom Button Component
 * Reusable button with multiple variants
 */
export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) => {
  const getButtonStyle = () => {
    if (disabled) return styles.buttonDisabled;

    switch (variant) {
      case 'primary':
        return styles.buttonPrimary;
      case 'secondary':
        return styles.buttonSecondary;
      case 'outline':
        return styles.buttonOutline;
      case 'danger':
        return styles.buttonDanger;
      default:
        return styles.buttonPrimary;
    }
  };

  const getTextStyle = () => {
    if (disabled) return styles.textDisabled;

    switch (variant) {
      case 'outline':
        return styles.textOutline;
      default:
        return styles.textPrimary;
    }
  };

  return (
    <Pressable
      style={[styles.button, getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? Colors.primary : Colors.textLight} />
      ) : (
        <Text style={[styles.text, getTextStyle()]}>{title}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: moderateScale(48, 0.3),
    ...Shadow.small,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.secondary,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: moderateScale(2, 0.2),
    borderColor: Colors.primary,
  },
  buttonDanger: {
    backgroundColor: Colors.error,
  },
  buttonDisabled: {
    backgroundColor: Colors.disabled,
  },
  text: {
    ...Typography.button,
    fontWeight: 'bold',
  },
  textPrimary: {
    color: Colors.textLight,
  },
  textOutline: {
    color: Colors.primary,
  },
  textDisabled: {
    color: Colors.textSecondary,
  },
});

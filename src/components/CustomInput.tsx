import React from 'react';
import {View, Text, TextInput, StyleSheet, TextInputProps} from 'react-native';
import {Colors, Typography, Spacing, BorderRadius} from '../constants/theme';
import {moderateScale} from '../utils/responsive';

interface CustomInputProps extends TextInputProps {
  label: string;
  error?: string;
}

/**
 * Custom Input Component
 * Reusable input field with label and error handling
 */
export const CustomInput: React.FC<CustomInputProps> = ({label, error, ...props}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholderTextColor={Colors.textSecondary}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.body1,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: moderateScale(1, 0.2),
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body1,
    color: Colors.textPrimary,
    minHeight: moderateScale(48, 0.3),
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});

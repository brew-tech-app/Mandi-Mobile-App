import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {CustomInput} from '../components/CustomInput';
import {CustomButton} from '../components/CustomButton';
import {Colors, Typography, Spacing, BorderRadius} from '../constants/theme';
import AuthService from '../services/AuthService';

/**
 * Sign Up Screen
 * Handles new user registration
 */
export const SignUpScreen: React.FC<any> = ({navigation}) => {
  const [formData, setFormData] = useState({
    displayName: '',
    firmName: '',
    gstin: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
    if (errors[field]) {
      setErrors(prev => ({...prev, [field]: ''}));
    }
  };

  const validateGSTIN = (gstin: string): boolean => {
    // GSTIN format: 2 digits (state code) + 10 alphanumeric (PAN) + 1 digit (entity number) + 1 letter (Z) + 1 alphanumeric (checksum)
    // Example: 27AAPFU0939F1ZV
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin.toUpperCase());
  };

  const validateEmail = (email: string): boolean => {
    // Comprehensive email validation
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validate = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Full Name validation
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Full Name is required';
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayName = 'Name must be at least 2 characters';
    }

    // Firm Name validation
    if (!formData.firmName.trim()) {
      newErrors.firmName = 'Firm Name is required';
    } else if (formData.firmName.trim().length < 2) {
      newErrors.firmName = 'Firm Name must be at least 2 characters';
    }

    // GSTIN validation
    if (!formData.gstin.trim()) {
      newErrors.gstin = 'GSTIN Number is required';
    } else if (!validateGSTIN(formData.gstin)) {
      newErrors.gstin = 'Invalid GSTIN format (e.g., 27AAPFU0939F1ZV)';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Enter valid 10-digit Indian mobile number';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      // Silent GSTIN verification - don't block signup if check fails
      // const gstinExists = await AuthService.checkGSTINExists(formData.gstin.toUpperCase());
      // if (gstinExists) {
      //   Alert.alert('Registration Failed', 'This GSTIN number is already registered. Each GSTIN can only be used once.');
      //   setErrors({gstin: 'GSTIN already registered'});
      //   setLoading(false);
      //   return;
      // }

      await AuthService.signUp(
        formData.email.trim().toLowerCase(),
        formData.password,
        formData.displayName.trim(),
        formData.firmName.trim(),
        formData.gstin.toUpperCase(),
        formData.phoneNumber.trim(),
      );
      Alert.alert('Success', 'Account created successfully!', [
        {text: 'OK', onPress: () => navigation.replace('Main')},
      ]);
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join Mandi App to manage your grain trading
          </Text>
        </View>

        <View style={styles.form}>
          <CustomInput
            label="Full Name *"
            value={formData.displayName}
            onChangeText={value => updateField('displayName', value)}
            placeholder="Enter your full name"
            error={errors.displayName}
          />

          <CustomInput
            label="Firm Name *"
            value={formData.firmName}
            onChangeText={value => updateField('firmName', value)}
            placeholder="Enter your firm/business name"
            error={errors.firmName}
          />

          <CustomInput
            label="GSTIN Number *"
            value={formData.gstin}
            onChangeText={value => updateField('gstin', value.toUpperCase())}
            placeholder="27AAPFU0939F1ZV"
            autoCapitalize="characters"
            maxLength={15}
            error={errors.gstin}
          />

          <CustomInput
            label="Email *"
            value={formData.email}
            onChangeText={value => updateField('email', value.toLowerCase())}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <CustomInput
            label="Phone Number *"
            value={formData.phoneNumber}
            onChangeText={value => updateField('phoneNumber', value)}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.phoneNumber}
          />

          <CustomInput
            label="Password *"
            value={formData.password}
            onChangeText={value => updateField('password', value)}
            placeholder="Minimum 6 characters"
            secureTextEntry
            error={errors.password}
          />

          <CustomInput
            label="Confirm Password *"
            value={formData.confirmPassword}
            onChangeText={value => updateField('confirmPassword', value)}
            placeholder="Re-enter your password"
            secureTextEntry
            error={errors.confirmPassword}
          />

          <CustomButton
            title={loading ? 'Creating Account...' : 'Sign Up'}
            onPress={handleSignUp}
            loading={loading}
            disabled={loading}
            style={styles.signUpButton}
          />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <CustomButton
              title="Sign In"
              onPress={() => navigation.navigate('Login')}
              variant="outline"
              style={styles.loginButton}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body1,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  signUpButton: {
    marginTop: Spacing.md,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  loginText: {
    ...Typography.body1,
    color: Colors.textSecondary,
  },
  loginButton: {
    flex: 0,
    paddingHorizontal: 0,
  },
});

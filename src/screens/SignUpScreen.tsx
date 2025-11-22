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
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    businessName: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
    if (errors[field]) {
      setErrors(prev => ({...prev, [field]: ''}));
    }
  };

  const validate = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.displayName) {
      newErrors.displayName = 'Name is required';
    }

    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Phone number must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await AuthService.signUp(
        formData.email,
        formData.password,
        formData.displayName,
        formData.businessName || undefined,
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
            label="Business Name"
            value={formData.businessName}
            onChangeText={value => updateField('businessName', value)}
            placeholder="Enter your business name (optional)"
          />

          <CustomInput
            label="Email *"
            value={formData.email}
            onChangeText={value => updateField('email', value)}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <CustomInput
            label="Phone Number"
            value={formData.phoneNumber}
            onChangeText={value => updateField('phoneNumber', value)}
            placeholder="Enter 10-digit phone number (optional)"
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

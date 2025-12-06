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
 * Login Screen
 * Handles user authentication
 */
export const LoginScreen: React.FC<any> = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});

  const validate = (): boolean => {
    const newErrors: {email?: string; password?: string} = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      console.log('Login attempt with email:', email);
      await AuthService.signIn(email.trim().toLowerCase(), password);
      console.log('Sign in successful, navigating to Main');
      navigation.replace('Main');
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      Alert.alert('Enter Email', 'Please enter your email address first');
      return;
    }

    Alert.alert(
      'Reset Password',
      'Send password reset email?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Send',
          onPress: async () => {
            try {
              await AuthService.resetPassword(email);
              Alert.alert('Success', 'Password reset email sent!');
            } catch (error) {
              Alert.alert('Error', 'Failed to send reset email');
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Mandi App</Text>
          <Text style={styles.subtitle}>Grain Trading Management</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Sign In</Text>

          <CustomInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <CustomInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            error={errors.password}
          />

          <CustomButton
            title={loading ? 'Signing in...' : 'Sign In'}
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
          />

          <CustomButton
            title="Login with Phone Number"
            onPress={() => navigation.navigate('PhoneAuth')}
            variant="outline"
            style={styles.phoneButton}
          />

          <CustomButton
            title="Forgot Password?"
            onPress={handleForgotPassword}
            variant="outline"
            style={styles.forgotButton}
          />

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <CustomButton
              title="Sign Up"
              onPress={() => navigation.navigate('SignUp')}
              variant="outline"
              style={styles.signupButton}
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
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.h1,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body1,
    color: Colors.textSecondary,
  },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  formTitle: {
    ...Typography.h3,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  phoneButton: {
    marginTop: Spacing.md,
  },
  forgotButton: {
    marginTop: Spacing.sm,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  signupText: {
    ...Typography.body1,
    color: Colors.textSecondary,
  },
  signupButton: {
    flex: 0,
    paddingHorizontal: 0,
  },
});

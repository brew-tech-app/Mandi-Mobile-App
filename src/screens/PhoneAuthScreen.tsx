import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';
import {CustomButton} from '../components/CustomButton';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AuthService from '../services/AuthService';

/**
 * Phone Authentication Screen
 * Handles phone number login/signup with OTP verification
 */
export const PhoneAuthScreen: React.FC<any> = ({navigation}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [gstin, setGstin] = useState('');
  
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [resendTimer, setResendTimer] = useState(0);

  // Start resend timer
  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const validatePhoneNumber = (phone: string): boolean => {
    // Indian phone number validation (10 digits starting with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handleSendOTP = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit Indian phone number');
      return;
    }

    setLoading(true);
    try {
      const fullPhoneNumber = `+91${phoneNumber}`;
      const confirmation = await AuthService.sendOTP(fullPhoneNumber);
      setVerificationId(confirmation.verificationId);
      setStep('otp');
      setResendTimer(60); // 60 seconds resend timer
      Alert.alert('OTP Sent', 'Please check your phone for the verification code');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.verifyOTP(verificationId, otp);
      
      if (result.isNewUser) {
        setIsNewUser(true);
        setStep('profile');
      } else {
        // Existing user, navigate to main app
        navigation.replace('MainApp');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      await AuthService.updatePhoneUserProfile({
        displayName: displayName.trim(),
        firmName: firmName.trim() || undefined,
        gstin: gstin.trim() || undefined,
        phoneNumber: `+91${phoneNumber}`,
      });

      Alert.alert('Success', 'Profile completed successfully', [
        {text: 'OK', onPress: () => navigation.replace('MainApp')}
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    try {
      const fullPhoneNumber = `+91${phoneNumber}`;
      const confirmation = await AuthService.sendOTP(fullPhoneNumber);
      setVerificationId(confirmation.verificationId);
      setResendTimer(60);
      setOtp('');
      Alert.alert('OTP Sent', 'A new verification code has been sent');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const renderPhoneStep = () => (
    <>
      <View style={styles.iconContainer}>
        <Icon name="phone" size={64} color={Colors.primary} />
      </View>

      <Text style={styles.title}>Welcome to Mandi App</Text>
      <Text style={styles.subtitle}>Enter your phone number to continue</Text>

      <View style={styles.phoneInputContainer}>
        <View style={styles.countryCode}>
          <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
        </View>
        <TextInput
          style={styles.phoneInput}
          placeholder="Enter 10-digit number"
          placeholderTextColor={Colors.textSecondary}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          maxLength={10}
          autoFocus
        />
      </View>

      <CustomButton
        title={loading ? 'Sending OTP...' : 'Send OTP'}
        onPress={handleSendOTP}
        disabled={loading || phoneNumber.length !== 10}
      />

      <CustomButton
        title="Login with Email"
        onPress={() => navigation.navigate('Login')}
        variant="outline"
        style={styles.emailButton}
      />
    </>
  );

  const renderOTPStep = () => (
    <>
      <View style={styles.iconContainer}>
        <Icon name="message-text" size={64} color={Colors.primary} />
      </View>

      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code sent to{'\n'}+91 {phoneNumber}
      </Text>

      <TextInput
        style={styles.otpInput}
        placeholder="Enter 6-digit OTP"
        placeholderTextColor={Colors.textSecondary}
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />

      <CustomButton
        title={loading ? 'Verifying...' : 'Verify OTP'}
        onPress={handleVerifyOTP}
        disabled={loading || otp.length !== 6}
      />

      <View style={styles.resendContainer}>
        {resendTimer > 0 ? (
          <Text style={styles.timerText}>
            Resend OTP in {resendTimer} seconds
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
            <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => {
          setStep('phone');
          setOtp('');
          setVerificationId('');
        }}>
        <Text style={styles.linkText}>Change Phone Number</Text>
      </TouchableOpacity>
    </>
  );

  const renderProfileStep = () => (
    <>
      <View style={styles.iconContainer}>
        <Icon name="account" size={64} color={Colors.primary} />
      </View>

      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>Help us know you better</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Your Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor={Colors.textSecondary}
          value={displayName}
          onChangeText={setDisplayName}
          autoFocus
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Firm/Business Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter firm name (optional)"
          placeholderTextColor={Colors.textSecondary}
          value={firmName}
          onChangeText={setFirmName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>GSTIN</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter GSTIN (optional)"
          placeholderTextColor={Colors.textSecondary}
          value={gstin}
          onChangeText={(text) => setGstin(text.toUpperCase())}
          maxLength={15}
          autoCapitalize="characters"
        />
      </View>

      <CustomButton
        title={loading ? 'Completing...' : 'Complete Profile'}
        onPress={handleCompleteProfile}
        disabled={loading || !displayName.trim()}
      />

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => navigation.replace('MainApp')}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {step === 'phone' && renderPhoneStep()}
          {step === 'otp' && renderOTPStep()}
          {step === 'profile' && renderProfileStep()}
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
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontWeight: 'bold',
  },
  subtitle: {
    ...Typography.body1,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  countryCode: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  countryCodeText: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    padding: Spacing.md,
    ...Typography.body1,
    color: Colors.textPrimary,
  },
  otpInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.h3,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.body2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body1,
    color: Colors.textPrimary,
  },
  linkButton: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  linkText: {
    ...Typography.body2,
    color: Colors.primary,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  skipText: {
    ...Typography.body2,
    color: Colors.textSecondary,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  timerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  resendText: {
    ...Typography.body2,
    color: Colors.primary,
    fontWeight: '600',
  },
  emailButton: {
    marginTop: Spacing.md,
  },
});

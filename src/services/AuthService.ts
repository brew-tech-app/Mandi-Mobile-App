import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {User} from '../models/User';

/**
 * Authentication Service
 * Handles user authentication with Firebase
 */
class AuthService {
  private currentUser: User | null = null;

  /**
   * Check if GSTIN already exists
   */
  async checkGSTINExists(gstin: string): Promise<boolean> {
    try {
      console.log('Checking GSTIN in Firestore:', gstin);
      
      // Check if Firestore is available
      const firestoreInstance = firestore();
      if (!firestoreInstance) {
        console.warn('Firestore not available, skipping GSTIN check');
        return false;
      }

      const snapshot = await firestoreInstance
        .collection('gstins')
        .doc(gstin)
        .get();
      
      const exists = typeof snapshot.exists === 'function' ? snapshot.exists() : !!snapshot.exists;
      console.log('GSTIN check completed. Exists:', exists);
      return exists;
    } catch (error: any) {
      console.error('Error checking GSTIN:', error);
      console.error('Error details - Message:', error.message, 'Code:', error.code);
      
      // If it's a network/permission error, allow signup to proceed
      // but log the error for debugging
      if (error.code === 'unavailable' || error.code === 'permission-denied' || error.message?.includes('network')) {
        console.warn('Firestore unavailable, allowing signup to proceed');
        return false;
      }
      
      // For other errors, throw so UI can handle it
      throw new Error(`Unable to verify GSTIN. Please check your internet connection and try again. (${error.message || 'Unknown error'})`);
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(
    email: string,
    password: string,
    displayName?: string,
    firmName?: string,
    gstin?: string,
    phoneNumber?: string,
  ): Promise<User> {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      
      // Update profile
      if (displayName && userCredential.user) {
        await userCredential.user.updateProfile({displayName});
      }

      const user: User = {
        uid: userCredential.user.uid,
        email: userCredential.user.email || email,
        displayName: displayName || userCredential.user.displayName || undefined,
        firmName,
        gstin,
        phoneNumber,
        createdAt: new Date().toISOString(),
      };

      // Store GSTIN in Firestore to prevent duplicates
      if (gstin) {
        try {
          await firestore()
            .collection('gstins')
            .doc(gstin)
            .set({
              uid: userCredential.user.uid,
              email: email,
              firmName: firmName,
              createdAt: new Date().toISOString(),
            });
        } catch (error) {
          console.warn('Failed to store GSTIN in Firestore:', error);
          // Continue with signup even if GSTIN storage fails
        }
      }

      // Store user profile in Firestore
      try {
        await firestore()
          .collection('users')
          .doc(userCredential.user.uid)
          .set({
            email: user.email,
            displayName: user.displayName,
            firmName: user.firmName,
            gstin: user.gstin,
            phoneNumber: user.phoneNumber,
            createdAt: user.createdAt,
          });
      } catch (error) {
        console.warn('Failed to store user profile in Firestore:', error);
        // Continue with signup even if Firestore storage fails
      }

      await this.saveUserLocally(user);
      this.currentUser = user;
      
      return user;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<User> {
    try {
      console.log('Attempting sign in with email:', email);
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      console.log('Sign in successful, UID:', userCredential.user.uid);
      
      const user: User = {
        uid: userCredential.user.uid,
        email: userCredential.user.email || email,
        displayName: userCredential.user.displayName || undefined,
        phoneNumber: userCredential.user.phoneNumber || undefined,
        createdAt: new Date().toISOString(),
      };

      await this.saveUserLocally(user);
      this.currentUser = user;
      
      return user;
    } catch (error: any) {
      console.error('Sign in error:', error.code, error.message);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await auth().signOut();
      await AsyncStorage.removeItem('user');
      this.currentUser = null;
    } catch (error) {
      throw new Error('Failed to sign out');
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      this.currentUser = JSON.parse(userJson);
      return this.currentUser;
    }

    const firebaseUser = auth().currentUser;
    if (firebaseUser) {
      const user: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || undefined,
        phoneNumber: firebaseUser.phoneNumber || undefined,
        createdAt: new Date().toISOString(),
      };
      await this.saveUserLocally(user);
      this.currentUser = user;
      return user;
    }

    return null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<void> {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error) {
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const firebaseUser = auth().currentUser;
    if (firebaseUser && updates.displayName) {
      await firebaseUser.updateProfile({displayName: updates.displayName});
    }

    const updatedUser = {...currentUser, ...updates};
    await this.saveUserLocally(updatedUser);
    this.currentUser = updatedUser;

    return updatedUser;
  }

  /**
   * Save user data locally
   */
  private async saveUserLocally(user: User): Promise<void> {
    await AsyncStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * Send OTP to phone number
   */
  async sendOTP(phoneNumber: string): Promise<{verificationId: string}> {
    try {
      console.log('Sending OTP to:', phoneNumber);
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      console.log('OTP sent successfully, verification ID:', confirmation.verificationId);
      return {verificationId: confirmation.verificationId || ''};
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Verify OTP and sign in/sign up with phone number
   */
  async verifyOTP(verificationId: string, otp: string): Promise<{isNewUser: boolean; user: User}> {
    try {
      console.log('Verifying OTP...');
      const credential = auth.PhoneAuthProvider.credential(verificationId, otp);
      const userCredential = await auth().signInWithCredential(credential);
      
      const isNewUser = userCredential.additionalUserInfo?.isNewUser || false;
      const firebaseUser = userCredential.user;

      let user: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || undefined,
        phoneNumber: firebaseUser.phoneNumber || undefined,
        createdAt: new Date().toISOString(),
      };

      // If existing user, try to fetch profile from Firestore
      if (!isNewUser) {
        try {
          const userDoc = await firestore()
            .collection('users')
            .doc(firebaseUser.uid)
            .get();
          
          const exists = typeof userDoc.exists === 'function' ? userDoc.exists() : !!userDoc.exists;
          if (exists) {
            const userData = userDoc.data();
            user = {
              ...user,
              displayName: userData?.displayName || user.displayName,
              firmName: userData?.firmName,
              gstin: userData?.gstin,
              phoneNumber: userData?.phoneNumber || user.phoneNumber,
            };
          }
        } catch (error) {
          console.warn('Failed to fetch user profile from Firestore:', error);
        }
      }

      await this.saveUserLocally(user);
      this.currentUser = user;
      
      console.log('OTP verification successful. Is new user:', isNewUser);
      return {isNewUser, user};
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      if (error.code === 'auth/invalid-verification-code') {
        throw new Error('Invalid OTP. Please try again.');
      }
      if (error.code === 'auth/code-expired') {
        throw new Error('OTP has expired. Please request a new one.');
      }
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Update phone user profile (for new users after OTP verification)
   */
  async updatePhoneUserProfile(updates: {
    displayName?: string;
    firmName?: string;
    gstin?: string;
    phoneNumber?: string;
  }): Promise<User> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const firebaseUser = auth().currentUser;
    if (!firebaseUser) {
      throw new Error('No authenticated user');
    }

    // Update Firebase profile
    if (updates.displayName) {
      await firebaseUser.updateProfile({displayName: updates.displayName});
    }

    // Update Firestore
    try {
      await firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .set({
          email: currentUser.email || '',
          displayName: updates.displayName || currentUser.displayName,
          firmName: updates.firmName || null,
          gstin: updates.gstin || null,
          phoneNumber: updates.phoneNumber || currentUser.phoneNumber,
          createdAt: currentUser.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, {merge: true});

      // Store GSTIN if provided
      if (updates.gstin) {
        await firestore()
          .collection('gstins')
          .doc(updates.gstin)
          .set({
            uid: firebaseUser.uid,
            email: currentUser.email,
            firmName: updates.firmName,
            createdAt: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.warn('Failed to update user profile in Firestore:', error);
      // Continue even if Firestore update fails
    }

    const updatedUser = {
      ...currentUser,
      ...updates,
    };

    await this.saveUserLocally(updatedUser);
    this.currentUser = updatedUser;

    return updatedUser;
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      case 'auth/invalid-phone-number':
        return 'Invalid phone number format';
      case 'auth/invalid-verification-code':
        return 'Invalid verification code';
      case 'auth/missing-phone-number':
        return 'Phone number is required';
      case 'auth/quota-exceeded':
        return 'SMS quota exceeded. Please try again later';
      default:
        return 'Authentication failed. Please try again';
    }
  }
}

export default new AuthService();

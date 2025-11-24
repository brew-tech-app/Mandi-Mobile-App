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
      default:
        return 'Authentication failed. Please try again';
    }
  }
}

export default new AuthService();

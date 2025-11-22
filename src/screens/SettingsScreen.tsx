import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, Typography, Spacing, BorderRadius} from '../constants/theme';
import {CustomButton} from '../components/CustomButton';
import AuthService from '../services/AuthService';
import CloudBackupService from '../services/CloudBackupService';
import {formatDateTime} from '../utils/helpers';

/**
 * Settings Screen
 * User profile, backup, and app settings
 */
export const SettingsScreen: React.FC<any> = ({navigation}) => {
  const [user, setUser] = useState<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadLastSyncTime();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLastSyncTime = async () => {
    try {
      const syncTime = await AsyncStorage.getItem('lastSyncTime');
      setLastSyncTime(syncTime);
    } catch (error) {
      console.error('Error loading sync time:', error);
    }
  };

  const handleBackup = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to backup data');
      return;
    }

    setSyncing(true);
    try {
      await CloudBackupService.backupToCloud();
      await loadLastSyncTime();
      Alert.alert('Success', 'Data backed up to cloud successfully!');
    } catch (error: any) {
      Alert.alert('Backup Failed', error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to restore data');
      return;
    }

    Alert.alert(
      'Restore Data',
      'This will replace your local data with cloud backup. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setSyncing(true);
            try {
              await CloudBackupService.restoreFromCloud();
              await loadLastSyncTime();
              Alert.alert('Success', 'Data restored from cloud successfully!');
            } catch (error: any) {
              Alert.alert('Restore Failed', error.message);
            } finally {
              setSyncing(false);
            }
          },
        },
      ],
    );
  };

  const handleSync = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to sync data');
      return;
    }

    setSyncing(true);
    try {
      await CloudBackupService.syncData();
      await loadLastSyncTime();
      Alert.alert('Success', 'Data synchronized successfully!');
    } catch (error: any) {
      Alert.alert('Sync Failed', error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await AuthService.signOut();
            navigation.replace('Login');
          } catch (error) {
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{user?.displayName || 'Not set'}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{user?.email}</Text>
          </View>
          {user?.businessName && (
            <View style={styles.profileRow}>
              <Text style={styles.label}>Business:</Text>
              <Text style={styles.value}>{user.businessName}</Text>
            </View>
          )}
          {user?.phoneNumber && (
            <View style={styles.profileRow}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{user.phoneNumber}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Cloud Backup Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cloud Backup</Text>
        <View style={styles.card}>
          {lastSyncTime && (
            <View style={styles.syncInfo}>
              <Text style={styles.syncLabel}>Last Sync:</Text>
              <Text style={styles.syncValue}>
                {formatDateTime(lastSyncTime)}
              </Text>
            </View>
          )}

          <CustomButton
            title={syncing ? 'Syncing...' : 'Sync Now'}
            onPress={handleSync}
            loading={syncing}
            disabled={syncing}
            style={styles.button}
          />

          <CustomButton
            title="Backup to Cloud"
            onPress={handleBackup}
            variant="outline"
            disabled={syncing}
            style={styles.button}
          />

          <CustomButton
            title="Restore from Cloud"
            onPress={handleRestore}
            variant="outline"
            disabled={syncing}
            style={styles.button}
          />

          <Text style={styles.helpText}>
            ✓ Instant Sync Enabled: All transactions automatically backup to
            cloud. Use "Sync Now" to ensure everything is up-to-date. "Restore"
            downloads cloud data to this device.
          </Text>
        </View>
      </View>

      {/* App Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Text style={styles.label}>Version:</Text>
            <Text style={styles.value}>1.0.0</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.label}>Database:</Text>
            <Text style={styles.value}>SQLite (Local) + Firestore (Cloud)</Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <CustomButton
        title="Logout"
        onPress={handleLogout}
        variant="outline"
        style={styles.logoutButton}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    ...Typography.body1,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  value: {
    ...Typography.body1,
    color: Colors.textPrimary,
  },
  syncInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
  },
  syncLabel: {
    ...Typography.body2,
    color: Colors.textSecondary,
  },
  syncValue: {
    ...Typography.body2,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  button: {
    marginTop: Spacing.sm,
  },
  instantSyncBadge: {
    backgroundColor: Colors.success,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  instantSyncText: {
    ...Typography.body2,
    color: Colors.textLight,
    fontWeight: '600',
  },
  helpText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
    lineHeight: 18,
  },
  logoutButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
});

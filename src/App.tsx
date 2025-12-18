import React, {useEffect, useState} from 'react';
import {SafeAreaView, StyleSheet, StatusBar, ActivityIndicator, View, Text} from 'react-native';
import {AppNavigator} from './navigation/AppNavigator';
import TransactionService from './services/TransactionService';
import CloudBackupService from './services/CloudBackupService';
import {Colors} from './constants/theme';

/**
 * Main App Component
 * Entry point of the application
 */
const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suppress noisy deprecation warnings while preserving other console output.
  // This wraps console.warn at app startup and filters messages that mention 'deprecated'
  // or 'DeprecationWarning'. Keep implementation minimal and reversible.
  useEffect(() => {
    const originalWarn = console.warn.bind(console);
    console.warn = (...args: any[]) => {
      try {
        const first = args && args.length > 0 ? String(args[0]) : '';
        if (first && /deprecated|DeprecationWarning/i.test(first)) {
          // Optionally route to debug logger instead of showing in console
          // console.debug('[deprecated suppressed]', first);
          return;
        }
      } catch (e) {
        // If filtering fails, fall back to original warn
        originalWarn(...args);
        return;
      }
      originalWarn(...args);
    };

    return () => {
      // Restore original console.warn on unmount
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const init = async () => {
      try {
        // Initialize database
        await TransactionService.initializeDatabase();

        // Process any pending uploads (will no-op if offline)
        try {
          await CloudBackupService.processPendingUploads();
        } catch (e) {
          console.warn('Failed to process pending uploads at startup', e);
        }

        // Run a full sync if the service determines it's needed
        try {
          const needs = await CloudBackupService.needsSync();
          if (needs) {
            // Run sync in background (don't block UI init)
            CloudBackupService.syncData().catch(err => console.warn('Auto-sync failed', err));
          }
        } catch (e) {
          console.warn('Failed to evaluate/trigger initial sync', e);
        }

        // Schedule periodic sync every 15 minutes
        intervalId = setInterval(() => {
          CloudBackupService.processPendingUploads().catch(console.error);
          CloudBackupService.syncData().catch(console.error);
        }, 15 * 60 * 1000);

        setIsInitialized(true);
      } catch (err) {
        console.error('Error initializing app:', err);
        setError('Failed to initialize database. Please restart the app.');
      }
    };

    init();

    return () => {
      if (intervalId) clearInterval(intervalId as unknown as number);
    };
  }, []);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Initializing Mandi App...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <AppNavigator />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
});

export default App;

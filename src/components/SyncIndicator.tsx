import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import CloudBackupService from '../services/CloudBackupService';

export default function SyncIndicator() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [pendingUploads, setPendingUploads] = useState<number>(0);
  const [hasPendingMeta, setHasPendingMeta] = useState<boolean>(false);

  useEffect(() => {
    const sub = NetInfo.addEventListener(state => {
      setIsConnected(!!state.isConnected);
    });

    let mounted = true;
    async function refresh() {
      const count = await CloudBackupService.getPendingUploadsCount();
      const meta = await CloudBackupService.hasPendingMeta();
      if (mounted) {
        setPendingUploads(count);
        setHasPendingMeta(meta);
      }
    }

    refresh();
    const interval = setInterval(refresh, 10_000);

    return () => {
      mounted = false;
      sub();
      clearInterval(interval);
    };
  }, []);

  const statusText = isConnected === null ? 'Checking…' : isConnected ? 'Online' : 'Offline';

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{statusText}</Text>
      <Text style={styles.badge}>{pendingUploads} ⬆</Text>
      {hasPendingMeta ? <Text style={styles.meta}>M</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  status: {
    fontSize: 12,
    color: '#333',
    marginRight: 8,
  },
  badge: {
    fontSize: 12,
    color: '#007AFF',
    marginRight: 6,
  },
  meta: {
    fontSize: 12,
    color: '#FF9500',
  },
});

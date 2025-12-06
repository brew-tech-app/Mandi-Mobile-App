import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import TransactionService from '../services/TransactionService';
import { BuyTransaction, SellTransaction, LendTransaction } from '../models/Transaction';

export const SearchResultsScreen: React.FC<any> = ({ navigation, route }) => {
  const phoneNumber = route.params?.phoneNumber || '';
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const buy = await TransactionService.searchBuyTransactionsByPhone(phoneNumber);
        const sell = await TransactionService.searchSellTransactionsByPhone(phoneNumber);
        const lend = await TransactionService.searchLendTransactionsByPhone(phoneNumber);
        const combined = [
          ...buy.map(t => ({ ...t, type: 'Buy' })),
          ...sell.map(t => ({ ...t, type: 'Sell' })),
          ...lend.map(t => ({ ...t, type: 'Lend' })),
        ];
        setResults(combined);
      } catch (error) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [phoneNumber]);

  const renderItem = ({ item }: { item: any }) => {
    const onPress = () => {
      // Open root-level receipt screens (modal) so back works predictably
      if (item.type === 'Buy') {
        navigation.navigate('BuyTransactionReceiptModal', { transactionId: item.id });
      } else if (item.type === 'Sell') {
        navigation.navigate('SellTransactionReceiptModal', { transactionId: item.id });
      } else if (item.type === 'Lend') {
        navigation.navigate('LendTransactionReceiptModal', { transactionId: item.id });
      }
    };

    return (
      <TouchableOpacity style={styles.card} onPress={onPress}>
        <Text style={styles.type}>{item.type} Transaction</Text>
        <Text style={styles.name}>{item.supplierName || item.buyerName || item.personName}</Text>
        <Text style={styles.phone}>{item.supplierPhone || item.buyerPhone || item.personPhone}</Text>
        <Text style={styles.amount}>Amount: ₹{item.totalAmount || item.amount || 0}</Text>
        <Text style={styles.date}>Date: {item.date}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Search Results for {phoneNumber}</Text>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : results.length === 0 ? (
        <Text style={styles.noResults}>No transactions found.</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, idx) => item.id + '-' + item.type + '-' + idx}
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },
  header: {
    ...Typography.h2,
    marginBottom: Spacing.md,
    color: Colors.primary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  type: {
    ...Typography.body2,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  name: {
    ...Typography.h3,
    marginTop: Spacing.xs,
  },
  phone: {
    ...Typography.body1,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  amount: {
    ...Typography.body1,
    color: Colors.textPrimary,
  },
  date: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  noResults: {
    ...Typography.body1,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});

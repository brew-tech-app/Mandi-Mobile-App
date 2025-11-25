import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';
import {LendTransaction, PaymentStatus} from '../models/Transaction';
import TransactionService from '../services/TransactionService';

/**
 * Lend Transactions List Screen
 * Displays all lend transactions
 */
export const LendTransactionsListScreen: React.FC<any> = ({navigation}) => {
  const [transactions, setTransactions] = useState<LendTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadTransactions();
    }, [])
  );

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await TransactionService.getAllLendTransactions();
      // Sort by date descending
      const sorted = data.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setTransactions(sorted);
    } catch (error) {
      console.error('Error loading lend transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.COMPLETED:
        return Colors.success;
      case PaymentStatus.PARTIAL:
        return Colors.warning;
      case PaymentStatus.PENDING:
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusText = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.COMPLETED:
        return 'Settled';
      case PaymentStatus.PARTIAL:
        return 'Partial';
      case PaymentStatus.PENDING:
        return 'Pending';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderTransaction = ({item}: {item: LendTransaction}) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => navigation.navigate('LendTransactionReceipt', {transactionId: item.id})}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.personName}>{item.personName}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
        </View>
        <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.paymentStatus)}]}>
          <Text style={styles.statusText}>{getStatusText(item.paymentStatus)}</Text>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.detailValue}>₹{(item.amount || 0).toFixed(2)}</Text>
        </View>
        {item.personPhone && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={styles.detailValue}>{item.personPhone}</Text>
          </View>
        )}
      </View>

      <View style={styles.transactionFooter}>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>₹{(item.amount || 0).toFixed(2)}</Text>
        </View>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Returned</Text>
          <Text style={[styles.amountValue, styles.returnedAmount]}>
            ₹{item.returnedAmount.toFixed(2)}
          </Text>
        </View>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Balance</Text>
          <Text style={[styles.amountValue, styles.balanceAmount]}>
            ₹{item.balanceAmount.toFixed(2)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No lend transactions yet</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddLendTransaction')}>
        <Text style={styles.addButtonText}>+ Add Lend Transaction</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Add Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lend Transactions</Text>
        <TouchableOpacity
          style={styles.headerAddButton}
          onPress={() => navigation.navigate('AddLendTransaction')}>
          <Text style={styles.headerAddButtonText}>+ Add Transaction</Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyList}
      />
    </View>
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
    backgroundColor: Colors.background,
  },
  loadingText: {
    ...Typography.body1,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadow.small,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  headerAddButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  headerAddButtonText: {
    ...Typography.body2,
    color: Colors.textLight,
    fontWeight: '600',
  },
  listContainer: {
    padding: Spacing.md,
  },
  transactionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.medium,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  transactionInfo: {
    flex: 1,
  },
  personName: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  transactionDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  transactionDetails: {
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  detailLabel: {
    ...Typography.body2,
    color: Colors.textSecondary,
  },
  detailValue: {
    ...Typography.body2,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  amountSection: {
    alignItems: 'center',
  },
  amountLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  amountValue: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  returnedAmount: {
    color: Colors.success,
  },
  balanceAmount: {
    color: Colors.error,
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body1,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  addButtonText: {
    ...Typography.button,
    color: Colors.textLight,
    fontWeight: '600',
  },
});

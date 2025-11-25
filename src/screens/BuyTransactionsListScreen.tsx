import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';
import {BuyTransaction} from '../models/Transaction';
import TransactionService from '../services/TransactionService';

/**
 * Buy Transactions List Screen
 * Displays all buy transactions with search by phone number
 */
export const BuyTransactionsListScreen: React.FC<any> = ({navigation, route}) => {
  const [transactions, setTransactions] = useState<BuyTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<BuyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedTab, setSelectedTab] = useState<'UNSETTLED' | 'SETTLED'>('UNSETTLED');

  useEffect(() => {
    // Check if searchPhone was passed from navigation
    if (route.params?.searchPhone) {
      setSearchPhone(route.params.searchPhone);
    }
    
    loadTransactions();
    
    // Add focus listener to reload data when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      // Check if searchPhone was passed from navigation
      if (route.params?.searchPhone) {
        setSearchPhone(route.params.searchPhone);
        // Clear the param so it doesn't persist on next focus
        navigation.setParams({ searchPhone: undefined });
      }
      loadTransactions();
    });

    return unsubscribe;
  }, [navigation, route.params?.searchPhone]);

  useEffect(() => {
    // Filter transactions based on tab and search
    let filtered = transactions;
    
    // Filter by tab (Unsettled or Settled)
    if (selectedTab === 'UNSETTLED') {
      filtered = filtered.filter(t => t.paymentStatus !== 'COMPLETED');
    } else {
      filtered = filtered.filter(t => t.paymentStatus === 'COMPLETED');
    }
    
    // Filter by search phone
    if (searchPhone.trim() !== '') {
      filtered = filtered.filter(t =>
        t.supplierPhone && t.supplierPhone.includes(searchPhone.trim())
      );
    }
    
    setFilteredTransactions(filtered);
  }, [searchPhone, transactions, selectedTab]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const allTransactions = await TransactionService.getAllBuyTransactions();
      // Sort by date descending
      const sorted = allTransactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setTransactions(sorted);
      setFilteredTransactions(sorted);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionPress = (transaction: BuyTransaction) => {
    navigation.navigate('BuyTransactionReceipt', {transactionId: transaction.id});
  };

  const handleDelete = async (transaction: BuyTransaction) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await TransactionService.deleteBuyTransaction(transaction.id);
              Alert.alert('Success', 'Transaction deleted successfully');
              loadTransactions();
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Settled';
      case 'PARTIAL':
        return 'Partial';
      case 'PENDING':
        return 'Pending';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return Colors.success;
      case 'PARTIAL':
        return Colors.warning;
      case 'PENDING':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  const renderTransaction = ({item}: {item: BuyTransaction}) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => handleTransactionPress(item)}
      onLongPress={() => handleDelete(item)}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.farmerName}>{item.supplierName}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
        </View>
        <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.paymentStatus)}]}>
          <Text style={styles.statusText}>{getStatusText(item.paymentStatus)}</Text>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Grain:</Text>
          <Text style={styles.detailValue}>{item.grainType}</Text>
        </View>
        {(() => {
          // Try to parse quantity breakdown from description
          if (item.description && item.description.includes('@')) {
            const match = item.description.match(/:(\s*\d+)\s*bags\s*×\s*(\d+)kg(?:\s*\+\s*(\d+)kg)?/);
            if (match) {
              const [, bags, weight, extra] = match;
              return (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quantity:</Text>
                    <Text style={styles.detailValue}>
                      {bags.trim()} × {weight}{extra ? ' + ' + extra : ''}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}></Text>
                    <Text style={styles.detailValue}>
                      {item.quantity.toFixed(2)} Qtl × ₹{item.ratePerQuintal.toFixed(2)}
                    </Text>
                  </View>
                </>
              );
            }
          }
          // Fallback to simple quantity display
          return (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quantity:</Text>
                <Text style={styles.detailValue}>{item.quantity.toFixed(2)} Qtl</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rate:</Text>
                <Text style={styles.detailValue}>₹{item.ratePerQuintal.toFixed(2)}/Qtl</Text>
              </View>
            </>
          );
        })()}
      </View>

      <View style={styles.transactionFooter}>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>₹{item.totalAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Paid</Text>
          <Text style={[styles.amountValue, styles.paidAmount]}>₹{item.paidAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Balance</Text>
          <Text style={[styles.amountValue, styles.balanceAmount]}>₹{item.balanceAmount.toFixed(2)}</Text>
        </View>
      </View>

      {item.supplierPhone && (
        <View style={styles.phoneSection}>
          <Text style={styles.phoneText}>📱 {item.supplierPhone}</Text>
        </View>
      )}
    </TouchableOpacity>
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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by phone number..."
          placeholderTextColor={Colors.textSecondary}
          value={searchPhone}
          onChangeText={setSearchPhone}
          keyboardType="phone-pad"
        />
        {searchPhone !== '' && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchPhone('')}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'UNSETTLED' && styles.tabActive,
          ]}
          onPress={() => setSelectedTab('UNSETTLED')}>
          <Text
            style={[
              styles.tabText,
              selectedTab === 'UNSETTLED' && styles.tabTextActive,
            ]}>
            Unsettled
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'SETTLED' && styles.tabActive,
          ]}
          onPress={() => setSelectedTab('SETTLED')}>
          <Text
            style={[
              styles.tabText,
              selectedTab === 'SETTLED' && styles.tabTextActive,
            ]}>
            Settled
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredTransactions.length} {selectedTab === 'UNSETTLED' ? 'unsettled' : 'settled'} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          {searchPhone && ' found'}
        </Text>
      </View>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchPhone
              ? `No ${selectedTab === 'UNSETTLED' ? 'unsettled' : 'settled'} transactions found for this phone number`
              : selectedTab === 'UNSETTLED'
              ? 'No unsettled transactions'
              : 'No settled transactions yet'}
          </Text>
          {!searchPhone && selectedTab === 'UNSETTLED' && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddBuyTransaction')}>
              <Text style={styles.addButtonText}>+ Add Transaction</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransaction}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    ...Typography.body1,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  clearButtonText: {
    ...Typography.h4,
    color: Colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    ...Typography.body1,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textLight,
  },
  resultsHeader: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  resultsText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  listContent: {
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
  farmerName: {
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
  paidAmount: {
    color: Colors.success,
  },
  balanceAmount: {
    color: Colors.error,
  },
  phoneSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  phoneText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
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

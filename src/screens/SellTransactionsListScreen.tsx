import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';
import {SellTransaction, PaymentStatus} from '../models/Transaction';
import TransactionService from '../services/TransactionService';

type TabType = 'UNSETTLED' | 'SETTLED';

/**
 * Sell Transactions List Screen
 * Displays all sell transactions with search and filter capabilities
 */
export const SellTransactionsListScreen: React.FC<any> = ({navigation, route}) => {
  const [transactions, setTransactions] = useState<SellTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<SellTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<TabType>('UNSETTLED');

  // Get search phone from navigation params (if coming from Dashboard search)
  const searchPhone = route.params?.searchPhone;

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      if (searchPhone) {
        setSearchQuery(searchPhone);
      }
    }, [searchPhone])
  );

  const loadTransactions = async () => {
    try {
      const data = await TransactionService.getAllSellTransactions();
      setTransactions(data);
      filterTransactions(data, searchQuery, selectedTab);
    } catch (error) {
      console.error('Error loading sell transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  useEffect(() => {
    filterTransactions(transactions, searchQuery, selectedTab);
  }, [searchQuery, selectedTab, transactions]);

  const filterTransactions = (data: SellTransaction[], query: string, tab: TabType) => {
    let filtered = data;

    // Filter by tab
    if (tab === 'UNSETTLED') {
      filtered = filtered.filter(t => t.paymentStatus !== PaymentStatus.COMPLETED);
    } else {
      filtered = filtered.filter(t => t.paymentStatus === PaymentStatus.COMPLETED);
    }

    // Filter by search query
    if (query.trim()) {
      filtered = filtered.filter(
        transaction =>
          transaction.buyerName.toLowerCase().includes(query.toLowerCase()) ||
          transaction.buyerPhone?.includes(query) ||
          transaction.grainType.toLowerCase().includes(query.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
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

  const renderTransaction = ({item}: {item: SellTransaction}) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => navigation.navigate('SellTransactionReceipt', {transactionId: item.id})}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.buyerName}>{item.buyerName}</Text>
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
            const match = item.description.match(/:(\s*\d+)\s*bags\s*×\s*([\d.]+)kg(?:\s*\+\s*([\d.]+)kg)?/);
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
          <Text style={styles.amountLabel}>Net Receivable</Text>
          <Text style={styles.amountValue}>₹{(item.totalAmount + (item.commissionAmount || 0) + (item.labourCharges || 0)).toFixed(2)}</Text>
        </View>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Received</Text>
          <Text style={[styles.amountValue, styles.receivedAmount]}>₹{item.receivedAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Balance</Text>
          <Text style={[styles.amountValue, styles.balanceAmount]}>₹{item.balanceAmount.toFixed(2)}</Text>
        </View>
      </View>

      {item.buyerPhone && (
        <View style={styles.phoneSection}>
          <Text style={styles.phoneText}>📱 {item.buyerPhone}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {searchQuery
          ? 'No transactions found matching your search'
          : selectedTab === 'UNSETTLED'
          ? 'No unsettled transactions'
          : 'No settled transactions'}
      </Text>
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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by buyer, phone, or grain..."
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'UNSETTLED' && styles.activeTab]}
          onPress={() => setSelectedTab('UNSETTLED')}>
          <Text style={[styles.tabText, selectedTab === 'UNSETTLED' && styles.activeTabText]}>
            Unsettled
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'SETTLED' && styles.activeTab]}
          onPress={() => setSelectedTab('SETTLED')}>
          <Text style={[styles.tabText, selectedTab === 'SETTLED' && styles.activeTabText]}>
            Settled
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredTransactions.length} {selectedTab === 'UNSETTLED' ? 'unsettled' : 'settled'} transaction{filteredTransactions.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
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
  searchContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadow.small,
  },
  searchInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    ...Typography.body1,
    color: Colors.textPrimary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeTab: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    ...Typography.body1,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.textLight,
  },
  resultsContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  resultsText: {
    ...Typography.caption,
    color: Colors.textSecondary,
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
  buyerName: {
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
  receivedAmount: {
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
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body1,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

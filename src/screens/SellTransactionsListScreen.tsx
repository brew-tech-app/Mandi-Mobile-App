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
  Modal,
} from 'react-native';
import {Calendar} from 'react-native-calendars';
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

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
      filterTransactions(data, searchQuery, selectedTab, selectedDate);
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
    filterTransactions(transactions, searchQuery, selectedTab, selectedDate);
  }, [searchQuery, selectedTab, transactions, selectedDate]);

  const filterTransactions = (data: SellTransaction[], query: string, tab: TabType, date: string | null) => {
    let filtered = data;

    // Filter by tab
    if (tab === 'UNSETTLED') {
      filtered = filtered.filter(t => t.paymentStatus !== PaymentStatus.COMPLETED);
    } else {
      filtered = filtered.filter(t => t.paymentStatus === PaymentStatus.COMPLETED);
    }

    // Filter by date
    if (date) {
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
        return transactionDate === date;
      });
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
        <View style={styles.headerRight}>
          {(() => {
            // Determine badge label for BillOfSupplyItems payloads.
            const desc = item.description || '';
            if (desc.startsWith('BillOfSupplyItems::')) {
              try {
                const payload = JSON.parse(decodeURIComponent(desc.replace('BillOfSupplyItems::', '')));
                const items = Array.isArray(payload) ? payload : (payload.items || []);
                const meta = Array.isArray(payload) ? {} : (payload.meta || {});
                const isNormalSingle = !!meta.normal || (items.length === 1 && meta.normal === true);
                const showBos = !isNormalSingle && items.length > 1;
                return (
                  <View style={[styles.typeBadge, showBos ? styles.bosBadge : styles.normalBadge]}>
                    <Text style={styles.typeBadgeText}>{showBos ? 'Bill of Supply' : 'Normal'}</Text>
                  </View>
                );
              } catch (e) {
                // Fallback when payload parsing fails
                return (
                  <View style={[styles.typeBadge, styles.bosBadge]}>
                    <Text style={styles.typeBadgeText}>Bill of Supply</Text>
                  </View>
                );
              }
            }
            return (
              <View style={[styles.typeBadge, styles.normalBadge]}>
                <Text style={styles.typeBadgeText}>Normal</Text>
              </View>
            );
          })()}
          <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.paymentStatus), marginLeft: Spacing.sm}] }>
            <Text style={styles.statusText}>{getStatusText(item.paymentStatus)}</Text>
          </View>
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
      {/* Search Bar and Date Filter */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by buyer, phone, or grain..."
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={[styles.dateButton, selectedDate ? styles.dateButtonActive : null]}
          onPress={() => setShowCalendar(true)}>
          <Text style={styles.dateButtonText}>
            {selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', {day: '2-digit', month: 'short'}) : '📅'}
          </Text>
        </TouchableOpacity>
        {selectedDate && (
          <TouchableOpacity
            style={styles.clearDateButton}
            onPress={() => setSelectedDate(null)}>
            <Text style={styles.dateButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Text style={styles.calendarClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={(day: {dateString: string}) => {
                setSelectedDate(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={
                selectedDate
                  ? {
                      [selectedDate]: {
                        selected: true,
                        selectedColor: Colors.primary,
                      },
                    }
                  : {}
              }
              theme={{
                backgroundColor: Colors.surface,
                calendarBackground: Colors.surface,
                textSectionTitleColor: Colors.textPrimary,
                selectedDayBackgroundColor: Colors.primary,
                selectedDayTextColor: Colors.surface,
                todayTextColor: Colors.primary,
                dayTextColor: Colors.textPrimary,
                textDisabledColor: Colors.textSecondary,
                monthTextColor: Colors.textPrimary,
                arrowColor: Colors.primary,
              }}
            />
          </View>
        </View>
      </Modal>

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
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadow.small,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    ...Typography.body1,
    color: Colors.textPrimary,
  },
  dateButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateButtonText: {
    ...Typography.body2,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  clearDateButton: {
    backgroundColor: Colors.error,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '90%',
    maxWidth: 400,
    ...Shadow.large,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  calendarTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  calendarClose: {
    ...Typography.h3,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.sm,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  typeBadgeText: {
    ...Typography.caption,
    color: Colors.textLight,
    fontWeight: '600',
  },
  bosBadge: {
    backgroundColor: Colors.primary,
  },
  normalBadge: {
    backgroundColor: Colors.primary,
  },
  statusLeftBadge: {
    marginRight: Spacing.sm,
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

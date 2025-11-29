import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {Calendar} from 'react-native-calendars';
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
  const [filteredTransactions, setFilteredTransactions] = useState<LendTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadTransactions();
    }, [])
  );

  useEffect(() => {
    filterTransactions();
  }, [transactions, selectedDate]);

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

  const filterTransactions = () => {
    let filtered = transactions;

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
        return transactionDate === selectedDate;
      });
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

  /**
   * Extract interest rate from transaction description
   */
  const getInterestRate = (transaction: LendTransaction): number => {
    if (!transaction?.description) return 0;
    const match = transaction.description.match(/Interest Rate:\s*(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  };

  /**
   * Calculate interest for current balance up to today
   */
  const calculateCurrentInterest = (transaction: LendTransaction): number => {
    const rate = getInterestRate(transaction);
    if (rate === 0 || transaction.balanceAmount === 0) return 0;

    // Calculate from transaction date to today for simplicity in list view
    // Note: This is a simplified calculation. For accurate interest, use the receipt screen
    const startDate = new Date(transaction.date);
    const today = new Date();
    const days = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const interest = (transaction.balanceAmount * rate * days) / (100 * 30);
    return Math.round(interest); // Round to nearest whole number
  };

  /**
   * Calculate total amount with interest
   */
  const getTotalWithInterest = (transaction: LendTransaction): number => {
    const interest = calculateCurrentInterest(transaction);
    return transaction.balanceAmount + interest;
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
          <Text style={styles.amountLabel}>Loan Amount</Text>
          <Text style={styles.amountValue}>₹{(item.amount || 0).toFixed(0)}</Text>
        </View>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Returned</Text>
          <Text style={[styles.amountValue, styles.returnedAmount]}>
            ₹{item.returnedAmount.toFixed(0)}
          </Text>
        </View>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Balance</Text>
          <Text style={[styles.amountValue, styles.balanceAmount]}>
            ₹{item.balanceAmount.toFixed(0)}
          </Text>
        </View>
      </View>
      {getInterestRate(item) > 0 && item.balanceAmount > 0 && (
        <View style={styles.interestFooter}>
          <View style={styles.interestSection}>
            <Text style={styles.interestLabel}>Interest ({getInterestRate(item)}%/month)</Text>
            <Text style={styles.interestValue}>₹{calculateCurrentInterest(item).toFixed(0)}</Text>
          </View>
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total Due</Text>
            <Text style={styles.totalValue}>₹{getTotalWithInterest(item).toFixed(0)}</Text>
          </View>
        </View>
      )}
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
        <View style={styles.headerActions}>
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
          <TouchableOpacity
            style={styles.headerAddButton}
            onPress={() => navigation.navigate('AddLendTransaction')}>
            <Text style={styles.headerAddButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Count */}
      {selectedDate && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} on {new Date(selectedDate).toLocaleDateString('en-IN')}
          </Text>
        </View>
      )}

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

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  resultsContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  resultsText: {
    ...Typography.caption,
    color: Colors.textSecondary,
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
  interestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  interestSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  interestLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  interestValue: {
    ...Typography.body2,
    color: Colors.warning,
    fontWeight: 'bold',
  },
  totalSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  totalLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  totalValue: {
    ...Typography.h4,
    color: Colors.primary,
    fontWeight: 'bold',
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

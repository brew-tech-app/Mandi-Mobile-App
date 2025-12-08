import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {Calendar} from 'react-native-calendars';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';
import {LendTransaction, PaymentStatus} from '../models/Transaction';
import {Payment} from '../models/Payment';
import TransactionService from '../services/TransactionService';
import {CustomButton} from '../components/CustomButton';

/**
 * Lend Transaction Receipt Screen
 * Displays detailed receipt with interest calculation
 */
export const LendTransactionReceiptScreen: React.FC<any> = ({route, navigation}) => {
  const {transactionId} = route.params;
  const [transaction, setTransaction] = useState<LendTransaction | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentType, setPaymentType] = useState<'PARTIAL' | 'FINAL'>('PARTIAL');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE' | 'CHEQUE'>('CASH');
  // Notes removed from UI; notes will be generated automatically when recording payment

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      const txn = await TransactionService.getLendTransaction(transactionId);
      setTransaction(txn);

      // Fetch payment history
      const paymentHistory = await TransactionService.getPaymentsByTransactionId(transactionId);
      setPayments(paymentHistory);
    } catch (error) {
      console.error('Error loading transaction:', error);
      Alert.alert('Error', 'Failed to load transaction details');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate interest for a given period
   * Interest = (Principal × Rate × Days) / (100 × 30)
   * Rate is per month, so we divide by 30 days
   */
  const calculateInterest = (
    principal: number,
    ratePerMonth: number,
    startDate: Date,
    endDate: Date
  ): number => {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const interest = (principal * ratePerMonth * days) / (100 * 30);
    return Math.round(interest); // Round to nearest whole number
  };

  /**
   * Extract interest rate from description
   */
  const getInterestRate = (): number => {
    if (!transaction?.description) return 0;
    const match = transaction.description.match(/Interest Rate:\s*(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  };

  /**
   * Calculate total interest and amount with interest up to a specific date
   */
  const calculateTotalInterestUpToDate = (upToDate: Date): {
    totalInterest: number;
    totalAmountWithInterest: number;
    currentPrincipal: number;
    interestBreakdown: Array<{period: string; principal: number; days: number; interest: number}>;
  } => {
    if (!transaction) return {totalInterest: 0, totalAmountWithInterest: 0, currentPrincipal: 0, interestBreakdown: []};

    const rate = getInterestRate();
    if (rate === 0) return {
      totalInterest: 0,
      totalAmountWithInterest: transaction.balanceAmount,
      currentPrincipal: transaction.balanceAmount,
      interestBreakdown: []
    };

    const lendDate = new Date(transaction.date);
    const sortedPayments = [...payments].sort(
      (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
    );

    // Start with the current balance from the transaction (this is the remaining principal after all payments)
    let currentPrincipal = transaction.balanceAmount || 0;
    // If there are no payments yet, use the original loan amount
    if (sortedPayments.length === 0) {
      currentPrincipal = transaction.amount || 0;
    }
    
    // Determine the start date for interest calculation
    // If there are payments, start from the last payment date
    // Otherwise, start from the loan date
    let currentDate = lendDate;
    if (sortedPayments.length > 0) {
      const lastPayment = sortedPayments[sortedPayments.length - 1];
      currentDate = new Date(lastPayment.paymentDate);
      // The current principal is the remaining balance after all payments
      currentPrincipal = transaction.balanceAmount || 0;
    }

    const interestBreakdown: Array<{period: string; principal: number; days: number; interest: number}> = [];

    // Calculate interest from the last payment date (or loan date) to upToDate
    const interest = calculateInterest(currentPrincipal, rate, currentDate, upToDate);
    const days = Math.ceil((upToDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    if (days > 0) {
      interestBreakdown.push({
        period: `${formatDate(currentDate)} to ${formatDate(upToDate)}`,
        principal: currentPrincipal,
        days,
        interest,
      });
    }

    const totalInterest = interest;

    const totalAmountWithInterest = currentPrincipal + totalInterest;

    return {totalInterest, totalAmountWithInterest, currentPrincipal, interestBreakdown};
  };

  /**
   * Calculate total interest and amount with interest (up to today)
   */
  const calculateTotalInterest = (): {
    totalInterest: number;
    totalAmountWithInterest: number;
    interestBreakdown: Array<{period: string; principal: number; days: number; interest: number}>;
  } => {
    const result = calculateTotalInterestUpToDate(new Date());
    return {
      totalInterest: result.totalInterest,
      totalAmountWithInterest: result.totalAmountWithInterest,
      interestBreakdown: result.interestBreakdown
    };
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleAddPayment = async () => {
    if (!transaction) return;

    // Calculate interest up to the selected payment date
    const {totalAmountWithInterest, totalInterest, currentPrincipal} = 
      calculateTotalInterestUpToDate(paymentDate);

    // For final settlement, use total amount with interest
    const amount = paymentType === 'FINAL' 
      ? totalAmountWithInterest
      : parseFloat(paymentAmount);

    if (paymentType === 'PARTIAL') {
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
        return;
      }

      if (amount > totalAmountWithInterest) {
        Alert.alert('Invalid Amount', 'Payment amount cannot exceed total amount with interest');
        return;
      }

      // Calculate interest payment and principal payment
      // Interest is only what has accrued since the last payment
      const interestPayment = Math.min(amount, totalInterest);
      const principalPayment = amount - interestPayment;

      // Show breakdown to user before confirming
      const remainingInterest = Math.max(0, totalInterest - interestPayment);
      const interestPaidInFull = interestPayment >= totalInterest;
      
      Alert.alert(
        'Payment Breakdown',
        `Total Payment: ₹${amount.toFixed(2)}\n` +
        `Interest Payment: ₹${interestPayment.toFixed(0)}\n` +
        `Principal Payment: ₹${principalPayment.toFixed(2)}\n\n` +
        `Current Principal: ₹${currentPrincipal.toFixed(2)}\n` +
        `New Principal: ₹${(currentPrincipal - principalPayment).toFixed(2)}\n\n` +
        `Accrued Interest (since last payment till ${formatDate(paymentDate)}): ₹${totalInterest.toFixed(0)}\n` +
        `Remaining Interest: ₹${remainingInterest.toFixed(0)}\n\n` +
        (interestPaidInFull && principalPayment < currentPrincipal
          ? `✓ Full interest paid! Future interest will be calculated from ${formatDate(paymentDate)} on remaining principal.`
          : ''),
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Confirm', onPress: () => processPayment(amount, totalInterest, currentPrincipal, principalPayment)}
        ]
      );
      return;
    }

    // For final settlement, proceed directly
    processPayment(amount, totalInterest, currentPrincipal, currentPrincipal);
  };

  const processPayment = async (
    amount: number, 
    totalInterest: number, 
    currentPrincipal: number,
    principalPayment: number
  ) => {
    if (!transaction) return;

    try {
      await TransactionService.addLendPayment(
        transaction.id,
        amount,
        paymentMode,
        paymentDate.toISOString(),
        paymentType,
      );

      Alert.alert('Success', 'Payment recorded successfully', [
        {text: 'OK', onPress: () => {
          setIsPaymentModalVisible(false);
          setPaymentAmount('');
          loadTransaction();
        }}
      ]);
    } catch (error) {
      console.error('Error recording payment:', error);
      Alert.alert('Error', 'Failed to record payment');
    }
  };

  const openPaymentModal = (type: 'PARTIAL' | 'FINAL') => {
    setPaymentType(type);
    setPaymentDate(new Date());
    setIsPaymentModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Transaction not found</Text>
      </View>
    );
  }

  const {totalInterest, totalAmountWithInterest, interestBreakdown} = calculateTotalInterest();
  const rate = getInterestRate();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Loan Details</Text>
          <View style={[styles.statusBadge, {
            backgroundColor: transaction.paymentStatus === PaymentStatus.COMPLETED 
              ? Colors.success 
              : transaction.paymentStatus === PaymentStatus.PARTIAL 
              ? Colors.warning 
              : Colors.error
          }]}>
            <Text style={styles.statusText}>
              {transaction.paymentStatus === PaymentStatus.COMPLETED 
                ? 'Settled' 
                : transaction.paymentStatus === PaymentStatus.PARTIAL 
                ? 'Partial' 
                : 'Pending'}
            </Text>
          </View>
        </View>

        {/* Person Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Borrower Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name:</Text>
            <Text style={styles.detailValue}>{transaction.personName}</Text>
          </View>
          {transaction.personPhone && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>{transaction.personPhone}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Loan Date:</Text>
            <Text style={styles.detailValue}>{formatDate(transaction.date)}</Text>
          </View>
        </View>

        {/* Loan Amount Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Loan Amount</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Principal Amount:</Text>
            <Text style={styles.amountValue}>₹{(transaction.amount || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Interest Rate:</Text>
            <Text style={styles.detailValue}>{rate}% per month</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Returned Amount:</Text>
            <Text style={[styles.amountValue, styles.successAmount]}>
              ₹{transaction.returnedAmount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Balance (Principal):</Text>
            <Text style={[styles.amountValue, styles.errorAmount]}>
              ₹{transaction.balanceAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Interest Calculation */}
        {rate > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Interest Calculation</Text>
            <View style={styles.interestSummary}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Interest:</Text>
                <Text style={[styles.amountValue, styles.warningAmount]}>
                  ₹{totalInterest.toFixed(0)}
                </Text>
              </View>
              <View style={[styles.detailRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Amount with Interest:</Text>
                <Text style={styles.totalValue}>
                  ₹{totalAmountWithInterest.toFixed(0)}
                </Text>
              </View>
            </View>

            {/* Interest Breakdown */}
            {interestBreakdown.length > 0 && (
              <View style={styles.breakdownContainer}>
                <Text style={styles.breakdownTitle}>Interest Breakdown:</Text>
                {interestBreakdown.map((item, index) => (
                  <View key={index} style={styles.breakdownItem}>
                    <Text style={styles.breakdownPeriod}>{item.period}</Text>
                    <Text style={styles.breakdownDetails}>
                      ₹{item.principal.toFixed(0)} × {rate}% × {item.days} days = ₹{item.interest.toFixed(0)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment History</Text>
            {payments.map((payment) => (
              <View key={payment.id} style={styles.paymentItem}>
                <View style={styles.paymentHeader}>
                  <Text style={styles.paymentDate}>{formatDate(payment.paymentDate)}</Text>
                  <Text style={styles.paymentAmount}>₹{payment.amount.toFixed(2)}</Text>
                </View>
                {payment.notes && (
                  <Text style={styles.paymentNotes}>{payment.notes}</Text>
                )}
                <Text style={styles.paymentMode}>{payment.paymentMode}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        {transaction.paymentStatus !== PaymentStatus.COMPLETED && (
          <View style={styles.actionsCard}>
            <CustomButton
              title="Add Partial Payment"
              onPress={() => openPaymentModal('PARTIAL')}
              variant="secondary"
            />
            <View style={{height: Spacing.md}} />
            <CustomButton
              title={`Settle Loan (₹${totalAmountWithInterest.toFixed(0)})`}
              onPress={() => openPaymentModal('FINAL')}
            />
          </View>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={isPaymentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsPaymentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {paymentType === 'FINAL' ? 'Final Settlement' : 'Add Payment'}
            </Text>

            {/* Payment Date */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Payment Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateButtonText}>📅 {formatDate(paymentDate)}</Text>
              </TouchableOpacity>
            </View>

            {(() => {
              // Calculate interest up to the selected payment date
              const {totalInterest: interestUpToDate, totalAmountWithInterest: amountUpToDate, currentPrincipal} = 
                calculateTotalInterestUpToDate(paymentDate);
              
              return (
                <>
                  {/* Show Interest Breakdown */}
                  <View style={styles.modalSection}>
                    <View style={styles.interestInfoBox}>
                      <Text style={styles.interestInfoLabel}>Interest (till {formatDate(paymentDate)})</Text>
                      <Text style={styles.interestInfoValue}>₹{interestUpToDate.toFixed(0)}</Text>
                    </View>
                    <View style={styles.interestInfoBox}>
                      <Text style={styles.interestInfoLabel}>Current Principal</Text>
                      <Text style={styles.interestInfoValue}>₹{currentPrincipal.toFixed(2)}</Text>
                    </View>
                  </View>

                  {paymentType === 'PARTIAL' && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Payment Amount</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Enter amount"
                        value={paymentAmount}
                        onChangeText={setPaymentAmount}
                        keyboardType="decimal-pad"
                      />
                      <Text style={styles.modalHint}>
                        Max: ₹{amountUpToDate.toFixed(0)} (Principal + Interest)
                      </Text>
                      <Text style={styles.modalHint}>
                        Note: Interest will be deducted first, remaining will reduce principal
                      </Text>
                    </View>
                  )}

                  {paymentType === 'FINAL' && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Settlement Amount</Text>
                      <Text style={styles.settlementAmount}>
                        ₹{amountUpToDate.toFixed(0)}
                      </Text>
                      <Text style={styles.modalHint}>
                        Principal: ₹{currentPrincipal.toFixed(2)} + Interest: ₹{interestUpToDate.toFixed(0)}
                      </Text>
                    </View>
                  )}
                </>
              );
            })()}

            {/* Payment Mode */}
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Payment Mode</Text>
              <View style={styles.paymentModes}>
                {['CASH', 'ONLINE', 'CHEQUE'].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.modeButton,
                      paymentMode === mode && styles.modeButtonActive,
                    ]}
                    onPress={() => setPaymentMode(mode as any)}>
                    <Text
                      style={[
                        styles.modeButtonText,
                        paymentMode === mode && styles.modeButtonTextActive,
                      ]}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes removed per UX request; notes are generated automatically on save */}

            <View style={styles.modalActions}>
              <CustomButton
                title="Cancel"
                onPress={() => setIsPaymentModalVisible(false)}
                variant="secondary"
                style={{flex: 1, minWidth: 0}}
              />
              <View style={{width: Spacing.md}} />
              <CustomButton
                title="Record Payment"
                onPress={handleAddPayment}
                style={{flex: 1, minWidth: 0}}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select Payment Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.calendarClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Calendar
              minDate={(() => {
                // Minimum date is either loan date or last payment date
                if (payments.length > 0) {
                  const lastPayment = [...payments].sort(
                    (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
                  )[0];
                  return new Date(lastPayment.paymentDate).toISOString().split('T')[0];
                }
                return new Date(transaction.date).toISOString().split('T')[0];
              })()}
              maxDate={new Date().toISOString().split('T')[0]}
              onDayPress={(day: any) => {
                setPaymentDate(new Date(day.dateString));
                setShowDatePicker(false);
              }}
              markedDates={{
                [paymentDate.toISOString().split('T')[0]]: {
                  selected: true,
                  selectedColor: Colors.primary,
                },
              }}
              theme={{
                backgroundColor: Colors.surface,
                calendarBackground: Colors.surface,
                selectedDayBackgroundColor: Colors.primary,
                selectedDayTextColor: Colors.textLight,
                todayTextColor: Colors.primary,
                dayTextColor: Colors.textPrimary,
                monthTextColor: Colors.textPrimary,
                arrowColor: Colors.primary,
              }}
            />
          </View>
        </View>
      </Modal>
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
  errorText: {
    ...Typography.body1,
    color: Colors.error,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.primary,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  statusText: {
    ...Typography.body2,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadow.medium,
  },
  cardTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
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
  amountValue: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  successAmount: {
    color: Colors.success,
  },
  errorAmount: {
    color: Colors.error,
  },
  warningAmount: {
    color: Colors.warning,
  },
  interestSummary: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  totalLabel: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  totalValue: {
    ...Typography.h3,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  breakdownContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  breakdownTitle: {
    ...Typography.body2,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  breakdownItem: {
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: Colors.warning,
    marginBottom: Spacing.sm,
  },
  breakdownPeriod: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  breakdownDetails: {
    ...Typography.body2,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  paymentItem: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  paymentDate: {
    ...Typography.body2,
    color: Colors.textSecondary,
  },
  paymentAmount: {
    ...Typography.body1,
    color: Colors.success,
    fontWeight: 'bold',
  },
  paymentNotes: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  paymentMode: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  actionsCard: {
    margin: Spacing.md,
    padding: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
  },
  modalSection: {
    marginBottom: Spacing.lg,
  },
  modalLabel: {
    ...Typography.body2,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body1,
    color: Colors.textPrimary,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  settlementAmount: {
    ...Typography.h2,
    color: Colors.primary,
    fontWeight: 'bold',
    marginVertical: Spacing.sm,
  },
  dateButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  dateButtonText: {
    ...Typography.body1,
    color: Colors.textPrimary,
  },
  paymentModes: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modeButtonText: {
    ...Typography.body2,
    color: Colors.textSecondary,
  },
  modeButtonTextActive: {
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: Spacing.lg,
  },
  calendarModal: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    width: '90%',
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  calendarTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  calendarClose: {
    ...Typography.h3,
    color: Colors.textSecondary,
  },
  interestInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  interestInfoLabel: {
    ...Typography.body2,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  interestInfoValue: {
    ...Typography.body1,
    color: Colors.primary,
    fontWeight: 'bold',
  },
});

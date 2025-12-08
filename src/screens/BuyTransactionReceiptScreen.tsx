import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Modal,
  TextInput,
} from 'react-native';
import {Colors, Typography, Spacing, BorderRadius} from '../constants/theme';
import {BuyTransaction} from '../models/Transaction';
import {Payment} from '../models/Payment';
import TransactionService from '../services/TransactionService';

/**
 * Buy Transaction Receipt Screen
 * Displays detailed receipt of buy transaction
 */
export const BuyTransactionReceiptScreen: React.FC<any> = ({route, navigation}) => {
  const {transactionId} = route.params;
  const [transaction, setTransaction] = useState<BuyTransaction | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [farmerAddress, setFarmerAddress] = useState<string>('N/A');
  const [loading, setLoading] = useState(true);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentType, setPaymentType] = useState<'PARTIAL' | 'FINAL'>('PARTIAL');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE' | 'CHEQUE'>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      const txn = await TransactionService.getBuyTransactionById(transactionId);
      setTransaction(txn);
      
      // Fetch farmer address
      if (txn && txn.supplierPhone) {
        const farmer = await TransactionService.getFarmerByPhone(txn.supplierPhone);
        if (farmer) {
          setFarmerAddress(farmer.address);
        }
      }

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

  const handleEdit = () => {
    navigation.navigate('EditBuyTransaction', {transactionId});
  };

  const handleShare = async () => {
    if (!transaction) return;

    const receiptText = generateReceiptText(transaction);
    try {
      await Share.share({
        message: receiptText,
      });
    } catch (error) {
      console.error('Error sharing receipt:', error);
    }
  };

  const handleAddPayment = async () => {
    if (!transaction) return;

    // For final settlement, use remaining balance
    const amount = paymentType === 'FINAL' 
      ? transaction.balanceAmount 
      : parseFloat(paymentAmount);

    if (paymentType === 'PARTIAL') {
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
        return;
      }

      if (amount > transaction.balanceAmount) {
        Alert.alert('Invalid Amount', 'Payment amount cannot exceed balance amount');
        return;
      }

      if (amount === transaction.balanceAmount) {
        Alert.alert(
          'Full Payment',
          'The amount you entered equals the balance. Would you like to record this as Final Settlement?',
          [
            {text: 'No, Partial Payment', onPress: () => recordPayment(amount)},
            {text: 'Yes, Final Settlement', onPress: () => recordPayment(amount, true)},
          ]
        );
        return;
      }
    }

    await recordPayment(amount, paymentType === 'FINAL');
  };

  const recordPayment = async (amount: number, isFinalSettlement: boolean = false) => {
    if (!transaction) return;

    try {
      const notes = isFinalSettlement 
        ? `Final Settlement${paymentNotes.trim() ? ': ' + paymentNotes.trim() : ''}` 
        : paymentNotes.trim() || undefined;

      await TransactionService.addBuyPayment(
        transactionId,
        amount,
        paymentMode,
        notes
      );

      Alert.alert(
        'Success', 
        isFinalSettlement 
          ? 'Final settlement completed successfully' 
          : 'Payment recorded successfully'
      );
      setIsPaymentModalVisible(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentType('PARTIAL');
      loadTransaction(); // Reload to show updated balance and payment history
    } catch (error: any) {
      console.error('Error adding payment:', error);
      Alert.alert('Error', error.message || 'Failed to record payment');
    }
  };

  const handleDeletePayment = async (paymentId: string, amount: number) => {
    Alert.alert(
      'Delete Payment',
      `Are you sure you want to delete this payment of ₹${amount.toFixed(2)}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await TransactionService.deletePayment(paymentId);
              Alert.alert('Success', 'Payment deleted successfully');
              loadTransaction(); // Reload to show updated balance
            } catch (error: any) {
              console.error('Error deleting payment:', error);
              Alert.alert('Error', error.message || 'Failed to delete payment');
            }
          },
        },
      ]
    );
  };

  const generateReceiptText = (txn: BuyTransaction): string => {
    const date = new Date(txn.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    let text = `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `     BUY TRANSACTION RECEIPT\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `Date: ${date}\n`;
    text += `Phone Number: ${txn.supplierPhone || 'N/A'}\n`;
    text += `Farmer Name: ${txn.supplierName}\n`;
    text += `Address: ${farmerAddress}\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `GRAIN DETAILS\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Parse grain details from description
    if (txn.description && txn.description.includes('@')) {
      const transactions = txn.description.split(';').filter(t => t.includes('@'));
      transactions.forEach((t) => {
        // Parse format: [1] Wheat: 10 bags × 50kg + 5kg @ ₹2000/qt
        const match = t.match(/\[(\d+)\]\s*([^:]+):\s*(\d+)\s*bags\s*×\s*(\d+)kg\s*\+\s*(\d+)kg\s*@\s*₹([\d.]+)\/qt/);
        if (match) {
          const [, , grainType, bags, weight, extra, price] = match;
          const totalWeight = ((parseFloat(bags) * parseFloat(weight) + parseFloat(extra)) / 100).toFixed(2);
          text += `${grainType.trim()}:\n`;
          text += `Quantity:                      ${bags} × ${weight} + ${extra}\n`;
          text += `                               ${totalWeight} Quintal × ₹${price}\n\n`;
        }
      });
    } else {
      text += `${txn.grainType}\n`;
      text += `${txn.quantity} Quintal\n\n`;
    }
    
    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Total Gross Amount: ₹${txn.totalAmount.toFixed(2)}\n\n`;
    
    const totalDeduction = (txn.labourCharges || 0) + (txn.commissionAmount || 0);
    const netPayableAfterDeductions = txn.totalAmount - totalDeduction;
    const totalPaymentSettlements = payments.reduce((sum, p) => sum + p.amount, 0);
    const initialAdvance = txn.paidAmount - totalPaymentSettlements;
    
    text += `DEDUCTIONS:\n`;
    text += `  Total Labour Charges: ₹${(txn.labourCharges || 0).toFixed(2)}\n`;
    text += `  Total Commission: ₹${(txn.commissionAmount || 0).toFixed(2)}\n`;
    text += `  Total Deduction: ₹${totalDeduction.toFixed(2)}\n\n`;
    
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Net Payable: ₹${netPayableAfterDeductions.toFixed(2)}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (initialAdvance > 0) {
      text += `Advance Paid (Initial): ₹${initialAdvance.toFixed(2)}\n\n`;
    }
    
    // Payment History
    if (payments.length > 0) {
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `PAYMENT HISTORY\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      payments.forEach((payment, idx) => {
        const paymentDate = new Date(payment.paymentDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        text += `${idx + 1}. ${paymentDate} - ₹${payment.amount.toFixed(2)}\n`;
        text += `   Mode: ${payment.paymentMode}\n`;
        if (payment.notes) {
          text += `   Notes: ${payment.notes}\n`;
        }
        text += `\n`;
      });
    }
    
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Final Net Payable: ₹${txn.balanceAmount.toFixed(2)}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Status: ${txn.paymentStatus}\n`;
    
    return text;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Transaction not found</Text>
      </View>
    );
  }

  const date = new Date(transaction.date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const totalDeduction = (transaction.labourCharges || 0) + (transaction.commissionAmount || 0);
  
  // Calculate initial advance (total paid minus payment settlements)
  const totalPaymentSettlements = payments.reduce((sum, p) => sum + p.amount, 0);
  const initialAdvance = transaction.paidAmount - totalPaymentSettlements;
  
  // Calculate net payable (after deductions but before any payments)
  const netPayableAfterDeductions = transaction.totalAmount - totalDeduction;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Receipt Header */}
        <View style={styles.receiptHeader}>
          <Text style={styles.receiptTitle}>BUY TRANSACTION RECEIPT</Text>
          <View style={styles.divider} />
        </View>

        {/* Basic Details */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone Number:</Text>
            <Text style={styles.value}>{transaction.supplierPhone || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Farmer Name:</Text>
            <Text style={styles.value}>{transaction.supplierName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{farmerAddress}</Text>
          </View>
        </View>

        {/* Grain Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Grain Details</Text>
          <View style={styles.divider} />
          
          {transaction.description && transaction.description.includes('@') ? (
            // Multiple transactions
            transaction.description.split(';').filter(t => t.includes('@')).map((txnDesc, idx) => {
              // Parse format: [1] Wheat: 10 bags × 50kg + 5kg @ ₹2000/qt
              const match = txnDesc.match(/\[(\d+)\]\s*([^:]+):\s*(\d+)\s*bags\s*×\s*(\d+)kg\s*\+\s*(\d+)kg\s*@\s*₹([\d.]+)\/qt/);
              if (match) {
                const [, , grainType, bags, weight, extra, price] = match;
                const totalWeight = ((parseFloat(bags) * parseFloat(weight) + parseFloat(extra)) / 100).toFixed(2);
                return (
                  <View key={idx} style={styles.grainItem}>
                    <Text style={styles.grainLabel}>{grainType.trim()}:</Text>
                    <View style={styles.row}>
                      <Text style={styles.label}>Quantity:</Text>
                      <Text style={styles.value}>{bags} × {weight} + {extra}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.label}></Text>
                      <Text style={styles.value}>{totalWeight} Quintal × ₹{price}</Text>
                    </View>
                  </View>
                );
              }
              return null;
            })
          ) : (
            // Single transaction
            <View style={styles.grainItem}>
              <Text style={styles.grainLabel}>{transaction.grainType}</Text>
              <Text style={styles.grainDetail}>{transaction.quantity} Quintal</Text>
            </View>
          )}
        </View>

        {/* Amount Details */}
        <View style={styles.section}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Gross Amount:</Text>
            <Text style={styles.amountValue}>₹{transaction.totalAmount.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.deductionTitle}>Deductions:</Text>
          <View style={styles.deductionRow}>
            <Text style={styles.deductionLabel}>Total Labour Charges</Text>
            <Text style={styles.deductionValue}>₹{(transaction.labourCharges || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.deductionRow}>
            <Text style={styles.deductionLabel}>Total Commission</Text>
            <Text style={styles.deductionValue}>₹{(transaction.commissionAmount || 0).toFixed(2)}</Text>
          </View>
          <View style={[styles.deductionRow, styles.totalDeduction]}>
            <Text style={styles.deductionLabelBold}>Total Deduction</Text>
            <Text style={styles.deductionValueBold}>₹{totalDeduction.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />
          
          <View style={styles.netPayableRow}>
            <Text style={styles.netPayableLabel}>Net Payable</Text>
            <Text style={styles.netPayableValue}>₹{netPayableAfterDeductions.toFixed(2)}</Text>
          </View>

          {initialAdvance > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.deductionRow}>
                <Text style={styles.deductionLabel}>Advance Paid (Initial)</Text>
                <Text style={styles.advanceValue}>₹{initialAdvance.toFixed(2)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Payments & Settlement Section */}
        {(transaction.balanceAmount > 0 || payments.length > 0) && (
          <View style={styles.section}>
            <View style={styles.paymentHeaderRow}>
              <Text style={styles.sectionTitle}>Payments & Settlement</Text>
              {transaction.balanceAmount > 0 && (
                <TouchableOpacity
                  style={styles.addPaymentButton}
                  onPress={() => setIsPaymentModalVisible(true)}>
                  <Text style={styles.addPaymentButtonText}>+ Add Payment</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.divider} />

            {payments.length > 0 ? (
              <View style={styles.paymentsListContainer}>
                {payments.map((payment, index) => {
                  const paymentDate = new Date(payment.paymentDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  return (
                    <View key={payment.id} style={styles.paymentCard}>
                      <View style={styles.paymentHeader}>
                        <View style={styles.paymentInfo}>
                          <Text style={styles.paymentDateText}>
                            {index + 1}. {paymentDate}
                          </Text>
                          <Text style={styles.paymentModeText}>Mode: {payment.paymentMode}</Text>
                          {payment.notes && (
                            <Text style={styles.paymentNotesText}>{payment.notes}</Text>
                          )}
                        </View>
                        <View style={styles.paymentActions}>
                          <Text style={styles.paymentAmountText}>₹{payment.amount.toFixed(2)}</Text>
                          <TouchableOpacity
                            onPress={() => handleDeletePayment(payment.id, payment.amount)}
                            style={styles.deletePaymentButton}>
                            <Text style={styles.deletePaymentText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noPaymentsText}>No payment settlements recorded yet</Text>
            )}
          </View>
        )}

        {/* Final Balance Section */}
        <View style={styles.finalBalanceSection}>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Balance Due:</Text>
            <Text style={[styles.balanceValue, transaction.balanceAmount === 0 && styles.balanceSettled]}>
              ₹{transaction.balanceAmount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Payment Status:</Text>
            <View style={[
              styles.statusBadge,
              transaction.paymentStatus === 'COMPLETED' && styles.statusCompleted,
              transaction.paymentStatus === 'PARTIAL' && styles.statusPartial,
              transaction.paymentStatus === 'PENDING' && styles.statusPending,
            ]}>
              <Text style={styles.statusText}>{transaction.paymentStatus}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>📤 Share Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>✏️ Edit Transaction</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={isPaymentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsPaymentModalVisible(false);
          setPaymentType('PARTIAL');
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Payment</Text>
            <Text style={styles.modalSubtitle}>
              Balance: ₹{transaction?.balanceAmount.toFixed(2)}
            </Text>

            <Text style={styles.modalLabel}>Payment Type</Text>
            <View style={styles.paymentTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.paymentTypeButton,
                  paymentType === 'PARTIAL' && styles.paymentTypeButtonActive,
                ]}
                onPress={() => setPaymentType('PARTIAL')}>
                <Text
                  style={[
                    styles.paymentTypeButtonText,
                    paymentType === 'PARTIAL' && styles.paymentTypeButtonTextActive,
                  ]}>
                  Partial Payment
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paymentTypeButton,
                  paymentType === 'FINAL' && styles.paymentTypeButtonActive,
                ]}
                onPress={() => setPaymentType('FINAL')}>
                <Text
                  style={[
                    styles.paymentTypeButtonText,
                    paymentType === 'FINAL' && styles.paymentTypeButtonTextActive,
                  ]}>
                  Final Settlement
                </Text>
              </TouchableOpacity>
            </View>

            {paymentType === 'PARTIAL' ? (
              <>
                <Text style={styles.modalLabel}>Amount</Text>
                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalRupee}>₹</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    autoFocus
                  />
                </View>
              </>
            ) : (
              <View style={styles.finalAmountDisplay}>
                <Text style={styles.finalAmountLabel}>Amount to be paid:</Text>
                <Text style={styles.finalAmountValue}>
                  ₹{transaction?.balanceAmount.toFixed(2)}
                </Text>
              </View>
            )}

            <Text style={styles.modalLabel}>Payment Mode</Text>
            <View style={styles.paymentModeContainer}>
              {(['CASH', 'ONLINE', 'CHEQUE'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.paymentModeButton,
                    paymentMode === mode && styles.paymentModeButtonActive,
                  ]}
                  onPress={() => setPaymentMode(mode)}>
                  <Text
                    style={[
                      styles.paymentModeButtonText,
                      paymentMode === mode && styles.paymentModeButtonTextActive,
                    ]}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.modalNotesInput}
              placeholder="Add payment notes..."
              value={paymentNotes}
              onChangeText={setPaymentNotes}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setIsPaymentModalVisible(false);
                  setPaymentAmount('');
                  setPaymentNotes('');
                  setPaymentType('PARTIAL');
                }}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleAddPayment}>
                <Text style={[styles.modalButtonText, {color: Colors.textLight}]}>
                  Record Payment
                </Text>
              </TouchableOpacity>
            </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  loadingText: {
    ...Typography.body1,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  errorText: {
    ...Typography.body1,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  receiptTitle: {
    ...Typography.h3,
    color: Colors.primary,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    width: '100%',
    marginVertical: Spacing.sm,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  label: {
    ...Typography.body2,
    color: Colors.textSecondary,
    flex: 1,
  },
  value: {
    ...Typography.body2,
    color: Colors.textPrimary,
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  grainItem: {
    marginBottom: Spacing.md,
  },
  grainLabel: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  grainDetail: {
    ...Typography.body2,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  grainCalculation: {
    ...Typography.body2,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  grainNumber: {
    ...Typography.body2,
    color: Colors.primary,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  grainText: {
    ...Typography.body2,
    color: Colors.textPrimary,
    flex: 1,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  amountLabel: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  amountValue: {
    ...Typography.h4,
    color: Colors.success,
    fontWeight: 'bold',
  },
  deductionTitle: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  deductionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  deductionLabel: {
    ...Typography.body2,
    color: Colors.textSecondary,
  },
  deductionValue: {
    ...Typography.body2,
    color: Colors.error,
  },
  totalDeduction: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  deductionLabelBold: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  deductionValueBold: {
    ...Typography.body1,
    color: Colors.error,
    fontWeight: '600',
  },
  netPayableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  netPayableLabel: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  netPayableValue: {
    ...Typography.h3,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  advanceValue: {
    ...Typography.body2,
    color: Colors.warning,
  },
  // Payment Section Styles
  paymentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addPaymentButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  addPaymentButtonText: {
    ...Typography.caption,
    color: Colors.textLight,
    fontWeight: '600',
  },
  paymentsListContainer: {
    marginTop: Spacing.sm,
  },
  paymentCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDateText: {
    ...Typography.body2,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  paymentModeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  paymentNotesText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  paymentActions: {
    alignItems: 'flex-end',
  },
  paymentAmountText: {
    ...Typography.h4,
    color: Colors.success,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  deletePaymentButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  deletePaymentText: {
    ...Typography.caption,
    color: Colors.textLight,
    fontSize: 10,
  },
  noPaymentsText: {
    ...Typography.body2,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  finalBalanceSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  balanceLabel: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  balanceValue: {
    ...Typography.h2,
    color: Colors.error,
    fontWeight: 'bold',
  },
  balanceSettled: {
    color: Colors.success,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    ...Typography.body1,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  statusCompleted: {
    backgroundColor: Colors.success,
  },
  statusPartial: {
    backgroundColor: Colors.warning,
  },
  statusPending: {
    backgroundColor: Colors.error,
  },
  statusText: {
    ...Typography.body1,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  actionButtons: {
    marginBottom: Spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: Spacing.sm,
  },
  shareButtonText: {
    ...Typography.button,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: Colors.background,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
    minWidth: 0,
  },
  editButtonText: {
    ...Typography.button,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...Typography.body2,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  modalRupee: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginRight: Spacing.sm,
  },
  modalInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  modalLabel: {
    ...Typography.body2,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  paymentTypeButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  paymentTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentTypeButtonText: {
    ...Typography.body2,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  paymentTypeButtonTextActive: {
    color: Colors.textLight,
  },
  finalAmountDisplay: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.success,
    alignItems: 'center',
  },
  finalAmountLabel: {
    ...Typography.body2,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  finalAmountValue: {
    ...Typography.h2,
    color: Colors.success,
    fontWeight: 'bold',
  },
  paymentModeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  paymentModeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  paymentModeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentModeButtonText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  paymentModeButtonTextActive: {
    color: Colors.textLight,
  },
  modalNotesInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Typography.body2,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  modalButtonSave: {
    backgroundColor: Colors.primary,
  },
  modalButtonText: {
    ...Typography.button,
    color: Colors.textPrimary,
  },
});

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
import {SellTransaction} from '../models/Transaction';
import {Payment} from '../models/Payment';
import TransactionService from '../services/TransactionService';

/**
 * Sell Transaction Receipt Screen
 * Displays detailed receipt of sell transaction
 */
export const SellTransactionReceiptScreen: React.FC<any> = ({route, navigation}) => {
  const {transactionId} = route.params;
  const [transaction, setTransaction] = useState<SellTransaction | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [buyerAddress, setBuyerAddress] = useState<string>('N/A');
  const [loading, setLoading] = useState(true);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentType, setPaymentType] = useState<'PARTIAL' | 'FINAL'>('PARTIAL');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE' | 'CHEQUE'>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const handleEdit = () => {
    navigation.navigate('EditSellTransaction', {transactionId});
  };

  const loadTransaction = async () => {
    try {
      setLoading(true);
      const txn = await TransactionService.getSellTransactionById(transactionId);
      setTransaction(txn);
      
      // Fetch buyer address (merchant or customer)
      if (txn && txn.buyerPhone) {
        const merchant = await TransactionService.getMerchantByPhone(txn.buyerPhone);
        if (merchant) {
          setBuyerAddress(merchant.address);
        } else {
          const customer = await TransactionService.getCustomerByPhone(txn.buyerPhone);
          if (customer) {
            setBuyerAddress(customer.address);
          }
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

      await TransactionService.addSellPayment(
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

  const generateReceiptText = (txn: SellTransaction): string => {
    const date = new Date(txn.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    let text = `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `     SELL TRANSACTION RECEIPT\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `Date: ${date}\n`;
    text += `Phone Number: ${txn.buyerPhone || 'N/A'}\n`;
    text += `Buyer Name: ${txn.buyerName}\n`;
    text += `Address: ${buyerAddress}\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `GRAIN DETAILS\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Parse grain details from description
    if (txn.description && txn.description.includes('@')) {
      const match = txn.description.match(/([^:]+):\s*(\d+)\s*bags\s*×\s*([\d.]+)kg(?:\s*\+\s*([\d.]+)kg)?\s*@\s*₹([\d.]+)\/qt/);
      if (match) {
        const [, grainType, bags, weight, extra, price] = match;
        const extraWeight = extra ? parseFloat(extra) : 0;
        const totalWeight = ((parseFloat(bags) * parseFloat(weight) + extraWeight) / 100).toFixed(2);
        text += `${grainType.trim()}:\n`;
        text += `Quantity:                      ${bags} × ${weight}${extra ? ' + ' + extra : ''}\n`;
        text += `                               ${totalWeight} Quintal × ₹${price}\n\n`;
      }
    } else {
      text += `${txn.grainType}\n`;
      text += `${txn.quantity.toFixed(2)} Quintal\n\n`;
    }
    
    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Gross Amount: ₹${txn.totalAmount.toFixed(2)}\n\n`;
    
    const totalAdditions = (txn.commissionAmount || 0) + (txn.labourCharges || 0);
    const netReceivableAfterAdditions = txn.totalAmount + totalAdditions;
    const totalPaymentReceived = payments.reduce((sum, p) => sum + p.amount, 0);
    const initialReceived = txn.receivedAmount - totalPaymentReceived;
    
    // Check if Bill of Supply to show detailed breakdown
    const isBillOfSupply = txn.description?.startsWith('Bill of Supply:');
    let arat = 0, tulak = 0, mandiShulk = 0;
    
    if (isBillOfSupply && txn.description) {
      const aratMatch = txn.description.match(/Arat: ₹([\d.]+)/);
      const tulakMatch = txn.description.match(/Tulak: ₹([\d.]+)/);
      const mandiShulkMatch = txn.description.match(/Mandi Shulk: ₹([\d.]+)/);
      if (aratMatch) arat = parseFloat(aratMatch[1]);
      if (tulakMatch) tulak = parseFloat(tulakMatch[1]);
      if (mandiShulkMatch) mandiShulk = parseFloat(mandiShulkMatch[1]);
    }
    
    text += `ADDITIONS:\n`;
    if (isBillOfSupply) {
      text += `  Arat: ₹${arat.toFixed(2)}\n`;
      text += `  Tulak: ₹${tulak.toFixed(2)}\n`;
      text += `  Mandi Shulk: ₹${mandiShulk.toFixed(2)}\n`;
    } else {
      text += `  Commission: ₹${(txn.commissionAmount || 0).toFixed(2)}\n`;
      text += `  Labour Charges: ₹${(txn.labourCharges || 0).toFixed(2)}\n`;
    }
    text += `  Total Additions: ₹${totalAdditions.toFixed(2)}\n\n`;
    
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Net Receivable: ₹${netReceivableAfterAdditions.toFixed(2)}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (initialReceived > 0) {
      text += `Amount Received (Initial): ₹${initialReceived.toFixed(2)}\n\n`;
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
    text += `Balance Due: ₹${txn.balanceAmount.toFixed(2)}\n`;
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

  const totalAdditions = (transaction.commissionAmount || 0) + (transaction.labourCharges || 0);
  
  // Calculate initial received (total received minus payment settlements)
  const totalPaymentReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const initialReceived = transaction.receivedAmount - totalPaymentReceived;
  
  // Calculate net receivable (after additions but before any payments)
  const netReceivableAfterAdditions = transaction.totalAmount + totalAdditions;
  
  // Check if Bill of Supply and parse charges
  const isBillOfSupply = transaction.description?.startsWith('Bill of Supply:');
  let arat = 0, tulak = 0, mandiShulk = 0;
  
  if (isBillOfSupply && transaction.description) {
    const aratMatch = transaction.description.match(/Arat: ₹([\d.]+)/);
    const tulakMatch = transaction.description.match(/Tulak: ₹([\d.]+)/);
    const mandiShulkMatch = transaction.description.match(/Mandi Shulk: ₹([\d.]+)/);
    if (aratMatch) arat = parseFloat(aratMatch[1]);
    if (tulakMatch) tulak = parseFloat(tulakMatch[1]);
    if (mandiShulkMatch) mandiShulk = parseFloat(mandiShulkMatch[1]);
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Receipt Header */}
        <View style={styles.receiptHeader}>
          <Text style={styles.receiptTitle}>SELL TRANSACTION RECEIPT</Text>
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
            <Text style={styles.value}>{transaction.buyerPhone || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Buyer Name:</Text>
            <Text style={styles.value}>{transaction.buyerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{buyerAddress}</Text>
          </View>
        </View>

        {/* Grain Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Grain Details</Text>
          <View style={styles.divider} />
          
          {transaction.description && transaction.description.includes('@') ? (
            // Parse grain details from description
            (() => {
              const match = transaction.description.match(/([^:]+):\s*(\d+)\s*bags\s*×\s*([\d.]+)kg(?:\s*\+\s*([\d.]+)kg)?\s*@\s*₹([\d.]+)\/qt/);
              if (match) {
                const [, grainType, bags, weight, extra, price] = match;
                const extraWeight = extra ? parseFloat(extra) : 0;
                const totalWeight = ((parseFloat(bags) * parseFloat(weight) + extraWeight) / 100).toFixed(2);
                return (
                  <View style={styles.grainItem}>
                    <Text style={styles.grainLabel}>{grainType.trim()}:</Text>
                    <View style={styles.row}>
                      <Text style={styles.label}>Quantity:</Text>
                      <Text style={styles.value}>{bags} × {weight}{extra ? ' + ' + extra : ''}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.label}></Text>
                      <Text style={styles.value}>{totalWeight} Quintal × ₹{price}</Text>
                    </View>
                  </View>
                );
              }
              return null;
            })()
          ) : (
            // Simple grain details
            <View style={styles.grainItem}>
              <Text style={styles.grainLabel}>{transaction.grainType}</Text>
              <Text style={styles.grainDetail}>{transaction.quantity.toFixed(2)} Quintal</Text>
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

          <Text style={styles.additionsTitle}>Additions:</Text>
          {isBillOfSupply ? (
            // Bill of Supply charges breakdown
            <>
              <View style={styles.additionRow}>
                <Text style={styles.additionLabel}>Arat</Text>
                <Text style={styles.additionValue}>₹{arat.toFixed(2)}</Text>
              </View>
              <View style={styles.additionRow}>
                <Text style={styles.additionLabel}>Tulak</Text>
                <Text style={styles.additionValue}>₹{tulak.toFixed(2)}</Text>
              </View>
              <View style={styles.additionRow}>
                <Text style={styles.additionLabel}>Mandi Shulk</Text>
                <Text style={styles.additionValue}>₹{mandiShulk.toFixed(2)}</Text>
              </View>
            </>
          ) : (
            // Normal transaction charges
            <>
              <View style={styles.additionRow}>
                <Text style={styles.additionLabel}>Commission</Text>
                <Text style={styles.additionValue}>₹{(transaction.commissionAmount || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.additionRow}>
                <Text style={styles.additionLabel}>Labour Charges</Text>
                <Text style={styles.additionValue}>₹{(transaction.labourCharges || 0).toFixed(2)}</Text>
              </View>
            </>
          )}
          <View style={[styles.additionRow, styles.totalAddition]}>
            <Text style={styles.additionLabelBold}>Total Additions</Text>
            <Text style={styles.additionValueBold}>₹{totalAdditions.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />
          
          <View style={styles.netReceivableRow}>
            <Text style={styles.netReceivableLabel}>Net Receivable</Text>
            <Text style={styles.netReceivableValue}>₹{netReceivableAfterAdditions.toFixed(2)}</Text>
          </View>

          {initialReceived > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.additionRow}>
                <Text style={styles.additionLabel}>Amount Received (Initial)</Text>
                <Text style={styles.receivedValue}>₹{initialReceived.toFixed(2)}</Text>
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
                          <Text style={styles.paymentDate}>
                            {index + 1}. {paymentDate}
                          </Text>
                          <Text style={styles.paymentMode}>Mode: {payment.paymentMode}</Text>
                          {payment.notes && (
                            <Text style={styles.paymentNotes}>{payment.notes}</Text>
                          )}
                        </View>
                        <View style={styles.paymentActions}>
                          <Text style={styles.paymentAmount}>₹{payment.amount.toFixed(2)}</Text>
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
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPaymentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Payment</Text>
            
            {/* Payment Type Selection */}
            <View style={styles.paymentTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.paymentTypeButton,
                  paymentType === 'PARTIAL' && styles.paymentTypeButtonActive,
                ]}
                onPress={() => setPaymentType('PARTIAL')}>
                <Text
                  style={[
                    styles.paymentTypeText,
                    paymentType === 'PARTIAL' && styles.paymentTypeTextActive,
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
                    styles.paymentTypeText,
                    paymentType === 'FINAL' && styles.paymentTypeTextActive,
                  ]}>
                  Final Settlement
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input (only for partial) */}
            {paymentType === 'PARTIAL' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount"
                  placeholderTextColor={Colors.textSecondary}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.balanceHint}>
                  Balance: ₹{transaction?.balanceAmount.toFixed(2)}
                </Text>
              </View>
            ) : (
              <View style={styles.finalAmountDisplay}>
                <Text style={styles.finalAmountLabel}>Settlement Amount:</Text>
                <Text style={styles.finalAmountValue}>
                  ₹{transaction?.balanceAmount.toFixed(2)}
                </Text>
              </View>
            )}

            {/* Payment Mode Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Mode</Text>
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
                        styles.paymentModeText,
                        paymentMode === mode && styles.paymentModeTextActive,
                      ]}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Add notes"
                placeholderTextColor={Colors.textSecondary}
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                multiline
              />
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setIsPaymentModalVisible(false);
                  setPaymentAmount('');
                  setPaymentNotes('');
                  setPaymentType('PARTIAL');
                }}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleAddPayment}>
                <Text style={styles.modalSaveButtonText}>Save Payment</Text>
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
    padding: Spacing.md,
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
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  receiptTitle: {
    ...Typography.h2,
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  label: {
    ...Typography.body2,
    color: Colors.textSecondary,
  },
  value: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
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
    ...Typography.body1,
    color: Colors.primary,
    fontWeight: '500',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  amountLabel: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  amountValue: {
    ...Typography.h4,
    color: Colors.success,
    fontWeight: 'bold',
  },
  additionsTitle: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  additionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  additionLabel: {
    ...Typography.body2,
    color: Colors.textSecondary,
  },
  additionValue: {
    ...Typography.body2,
    color: Colors.success,
    fontWeight: '500',
  },
  totalAddition: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  additionLabelBold: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  additionValueBold: {
    ...Typography.body1,
    color: Colors.success,
    fontWeight: 'bold',
  },
  netReceivableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  netReceivableLabel: {
    ...Typography.h3,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  netReceivableValue: {
    ...Typography.h3,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  receivedValue: {
    ...Typography.body2,
    color: Colors.success,
    fontWeight: '600',
  },
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
  paymentDate: {
    ...Typography.body2,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  paymentMode: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  paymentNotes: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  paymentActions: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
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
  },
  shareButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  shareButtonText: {
    ...Typography.button,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: Colors.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  editButtonText: {
    ...Typography.button,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  // Modal Styles
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
    maxWidth: 400,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  paymentTypeButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  paymentTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentTypeText: {
    ...Typography.body2,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  paymentTypeTextActive: {
    color: Colors.textLight,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.body2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    ...Typography.body1,
    color: Colors.textPrimary,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  balanceHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  finalAmountDisplay: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finalAmountLabel: {
    ...Typography.body1,
    color: Colors.textLight,
    fontWeight: '600',
  },
  finalAmountValue: {
    ...Typography.h3,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  paymentModeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  paymentModeButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  paymentModeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentModeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  paymentModeTextActive: {
    color: Colors.textLight,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    ...Typography.button,
    color: Colors.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    ...Typography.button,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
});

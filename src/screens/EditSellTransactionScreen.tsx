import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {Colors, Typography, Spacing, BorderRadius} from '../constants/theme';
import {SellTransaction} from '../models/Transaction';
import TransactionService from '../services/TransactionService';
import {CustomInput} from '../components/CustomInput';
import {CustomButton} from '../components/CustomButton';

/**
 * Edit Sell Transaction Screen
 * Allows editing existing sell transaction
 */
export const EditSellTransactionScreen: React.FC<any> = ({route, navigation}) => {
  const {transactionId} = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transaction, setTransaction] = useState<SellTransaction | null>(null);
  
  // Form fields
  const [receivedAmount, setReceivedAmount] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [labourCharges, setLabourCharges] = useState('');

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      const txn = await TransactionService.getSellTransactionById(transactionId);
      if (txn) {
        setTransaction(txn);
        setReceivedAmount(txn.receivedAmount.toString());
        setCommissionAmount((txn.commissionAmount || 0).toString());
        setLabourCharges((txn.labourCharges || 0).toString());
      } else {
        Alert.alert('Error', 'Transaction not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading transaction:', error);
      Alert.alert('Error', 'Failed to load transaction');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!transaction) return;

    const received = parseFloat(receivedAmount) || 0;
    const commission = parseFloat(commissionAmount) || 0;
    const labour = parseFloat(labourCharges) || 0;

    // Net Receivable = Total Amount + Commission + Labour
    const netReceivable = transaction.totalAmount + commission + labour;

    if (received > netReceivable) {
      Alert.alert('Error', 'Received amount cannot exceed net receivable amount');
      return;
    }

    try {
      setSaving(true);
      
      const balanceAmount = netReceivable - received;
      const paymentStatus =
        balanceAmount === 0
          ? 'COMPLETED'
          : received > 0
          ? 'PARTIAL'
          : 'PENDING';

      await TransactionService.updateSellTransaction(transactionId, {
        receivedAmount: received,
        balanceAmount,
        paymentStatus: paymentStatus as any,
        commissionAmount: commission,
        labourCharges: labour,
      });

      Alert.alert('Success', 'Transaction updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error updating transaction:', error);
      Alert.alert('Error', 'Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
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

  const commission = parseFloat(commissionAmount) || 0;
  const labour = parseFloat(labourCharges) || 0;
  const netReceivable = transaction.totalAmount + commission + labour;
  const received = parseFloat(receivedAmount) || 0;
  const balance = netReceivable - received;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Transaction Details (Read-only) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Buyer Name:</Text>
            <Text style={styles.detailValue}>{transaction.buyerName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={styles.detailValue}>{transaction.buyerPhone || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {new Date(transaction.date).toLocaleDateString('en-IN')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Grain Type:</Text>
            <Text style={styles.detailValue}>{transaction.grainType}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity:</Text>
            <Text style={styles.detailValue}>{transaction.quantity} Quintal</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gross Amount:</Text>
            <Text style={[styles.detailValue, styles.amountText]}>
              ₹{transaction.totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Editable Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          
          <CustomInput
            label="Commission Amount"
            value={commissionAmount}
            onChangeText={setCommissionAmount}
            placeholder="Enter commission amount"
            keyboardType="numeric"
          />

          <CustomInput
            label="Labour Charges"
            value={labourCharges}
            onChangeText={setLabourCharges}
            placeholder="Enter labour charges"
            keyboardType="numeric"
          />

          {/* Net Receivable */}
          <View style={styles.calculatedRow}>
            <Text style={styles.calculatedLabel}>Net Receivable:</Text>
            <Text style={[styles.calculatedValue, styles.successText]}>
              ₹{netReceivable.toFixed(2)}
            </Text>
          </View>

          <CustomInput
            label="Received Amount"
            value={receivedAmount}
            onChangeText={setReceivedAmount}
            placeholder="Enter received amount"
            keyboardType="numeric"
          />

          {/* Calculated Balance */}
          <View style={styles.calculatedRow}>
            <Text style={styles.calculatedLabel}>Balance Amount:</Text>
            <Text style={[styles.calculatedValue, balance > 0 ? styles.errorText : styles.successText]}>
              ₹{balance.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <CustomButton
          title={saving ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          disabled={saving}
        />

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert(
              'Delete Transaction',
              'Are you sure you want to delete this transaction? This action cannot be undone.',
              [
                {text: 'Cancel', style: 'cancel'},
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await TransactionService.deleteSellTransaction(transactionId);
                      Alert.alert('Success', 'Transaction deleted successfully', [
                        {
                          text: 'OK',
                          onPress: () => navigation.navigate('SellTransactionsList'),
                        },
                      ]);
                    } catch (error) {
                      console.error('Error deleting transaction:', error);
                      Alert.alert('Error', 'Failed to delete transaction');
                    }
                  },
                },
              ]
            );
          }}>
          <Text style={styles.deleteButtonText}>🗑️ Delete Transaction</Text>
        </TouchableOpacity>
      </ScrollView>
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
  errorText: {
    ...Typography.body1,
    color: Colors.error,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.xs,
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
  amountText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  calculatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    marginTop: Spacing.md,
  },
  calculatedLabel: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  calculatedValue: {
    ...Typography.h4,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  successText: {
    color: Colors.success,
  },
  deleteButton: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  deleteButtonText: {
    ...Typography.button,
    color: Colors.textLight,
  },
});

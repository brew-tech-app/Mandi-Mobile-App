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
import {BuyTransaction} from '../models/Transaction';
import TransactionService from '../services/TransactionService';
import {CustomInput} from '../components/CustomInput';
import {CustomButton} from '../components/CustomButton';

/**
 * Edit Buy Transaction Screen
 * Allows editing existing buy transaction
 */
export const EditBuyTransactionScreen: React.FC<any> = ({route, navigation}) => {
  const {transactionId} = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transaction, setTransaction] = useState<BuyTransaction | null>(null);
  
  // Form fields
  const [paidAmount, setPaidAmount] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [labourCharges, setLabourCharges] = useState('');

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      const txn = await TransactionService.getBuyTransactionById(transactionId);
      if (txn) {
        setTransaction(txn);
        setPaidAmount(txn.paidAmount.toString());
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

    const paid = parseFloat(paidAmount) || 0;
    const commission = parseFloat(commissionAmount) || 0;
    const labour = parseFloat(labourCharges) || 0;

    if (paid > transaction.totalAmount) {
      Alert.alert('Error', 'Paid amount cannot exceed total amount');
      return;
    }

    try {
      setSaving(true);
      
      const balanceAmount = transaction.totalAmount - paid;
      const paymentStatus =
        balanceAmount === 0
          ? 'COMPLETED'
          : paid > 0
          ? 'PARTIAL'
          : 'PENDING';

      await TransactionService.updateBuyTransaction(transactionId, {
        paidAmount: paid,
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Transaction Details (Read-only) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Farmer Name:</Text>
            <Text style={styles.detailValue}>{transaction.supplierName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={styles.detailValue}>{transaction.supplierPhone || 'N/A'}</Text>
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
            <Text style={styles.detailLabel}>Total Amount:</Text>
            <Text style={[styles.detailValue, styles.amountText]}>
              ₹{transaction.totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Editable Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          
          <CustomInput
            label="Paid Amount"
            value={paidAmount}
            onChangeText={setPaidAmount}
            placeholder="Enter paid amount"
            keyboardType="numeric"
          />

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
            onChangeText={(text: string) => {
              const value = parseFloat(text) || 0;
              const rounded = Math.round(value / 10) * 10;
              setLabourCharges(rounded.toString());
            }}
            placeholder="Enter labour charges"
            keyboardType="numeric"
          />

          {/* Calculated Balance */}
          <View style={styles.calculatedRow}>
            <Text style={styles.calculatedLabel}>Balance Amount:</Text>
            <Text style={styles.calculatedValue}>
              ₹{(transaction.totalAmount - (parseFloat(paidAmount) || 0)).toFixed(2)}
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
                      await TransactionService.deleteBuyTransaction(transactionId);
                      Alert.alert('Success', 'Transaction deleted successfully', [
                        {
                          text: 'OK',
                          onPress: () => navigation.navigate('BuyTransactionsList'),
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
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    ...Typography.body2,
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    ...Typography.body2,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  amountText: {
    ...Typography.body1,
    color: Colors.success,
    fontWeight: '600',
  },
  calculatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
  },
  calculatedLabel: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  calculatedValue: {
    ...Typography.h4,
    color: Colors.error,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: Colors.error,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  deleteButtonText: {
    ...Typography.button,
    color: Colors.textLight,
    fontWeight: '600',
  },
});

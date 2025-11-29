import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {Calendar} from 'react-native-calendars';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';
import {CustomButton} from '../components/CustomButton';
import TransactionService from '../services/TransactionService';
import {PaymentStatus} from '../models/Transaction';
import DatabaseService from '../database/DatabaseService';
import {FarmerRepository} from '../repositories/FarmerRepository';

/**
 * Add Buy Transaction Screen
 * Form to create new grain purchase transaction from farmer
 */
export const AddBuyTransactionScreen: React.FC<any> = ({navigation}) => {
  // Farmer Details
  const [farmerPhone, setFarmerPhone] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [farmerAddress, setFarmerAddress] = useState('');
  const [farmerExists, setFarmerExists] = useState(false);
  const [checkingFarmer, setCheckingFarmer] = useState(false);
  const [showFarmerFields, setShowFarmerFields] = useState(false);
  
  // Date Selection
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Grain Details - Support multiple transactions
  interface GrainTransaction {
    id: string;
    grainType: string;
    numberOfBags: string;
    weightPerBag: string;
    extraWeight: string;
    pricePerQuintal: string;
  }
  
  const [grainTransactions, setGrainTransactions] = useState<GrainTransaction[]>([
    {
      id: '1',
      grainType: '',
      numberOfBags: '',
      weightPerBag: '',
      extraWeight: '',
      pricePerQuintal: '',
    }
  ]);
  
  // Fees & Charges
  const [commissionPercent, setCommissionPercent] = useState('');
  const [labourChargePerBag, setLabourChargePerBag] = useState('');
  
  // Payments & Adjustment
  const [advancePaid, setAdvancePaid] = useState('');
  const [roundOff, setRoundOff] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [farmerRepository, setFarmerRepository] = useState<FarmerRepository | null>(null);
  const [activeLoanAmount, setActiveLoanAmount] = useState<number>(0);

  useEffect(() => {
    initializeFarmerRepository();
  }, []);

  const initializeFarmerRepository = async () => {
    const db = await DatabaseService.initDatabase();
    setFarmerRepository(new FarmerRepository(db));
  };

  // Check farmer when phone number changes
  useEffect(() => {
    if (farmerPhone.length === 10) {
      checkFarmerExists();
    } else {
      setFarmerExists(false);
      setShowFarmerFields(false);
      setFarmerName('');
      setFarmerAddress('');
    }
  }, [farmerPhone]);

  const handleDateChange = (dateString: string) => {
    const selectedDate = new Date(dateString);
    setTransactionDate(selectedDate);
    setShowDatePicker(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const checkFarmerExists = async () => {
    if (!farmerRepository) return;
    
    setCheckingFarmer(true);
    try {
      const farmer = await farmerRepository.findByPhoneNumber(farmerPhone);
      if (farmer) {
        setFarmerExists(true);
        setFarmerName(farmer.name);
        setFarmerAddress(farmer.address);
        setShowFarmerFields(false);
      } else {
        setFarmerExists(false);
        setShowFarmerFields(true);
        setFarmerName('');
        setFarmerAddress('');
      }
      
      // Check for active loans by phone number
      const allLendTransactions = await TransactionService.getAllLendTransactions();
      const lendTransactions = allLendTransactions.filter(t => t.personPhone === farmerPhone);
      const activeLoan = lendTransactions
        .filter(t => t.lendType === 'MONEY' && t.balanceAmount > 0)
        .reduce((sum, t) => sum + t.balanceAmount, 0);
      setActiveLoanAmount(activeLoan);
    } catch (error) {
      console.error('Error checking farmer:', error);
    } finally {
      setCheckingFarmer(false);
    }
  };

  // Helper functions for individual transaction calculations
  const calculateTransactionWeight = (transaction: GrainTransaction): number => {
    const bags = parseFloat(transaction.numberOfBags) || 0;
    const weightBag = parseFloat(transaction.weightPerBag) || 0;
    const extra = parseFloat(transaction.extraWeight) || 0;
    return (bags * weightBag + extra) / 100;
  };

  const calculateTransactionAmount = (transaction: GrainTransaction): number => {
    const weight = calculateTransactionWeight(transaction);
    const price = parseFloat(transaction.pricePerQuintal) || 0;
    return Math.round(weight * price);
  };

  const calculateTransactionLabourCharges = (transaction: GrainTransaction): number => {
    const bags = parseFloat(transaction.numberOfBags) || 0;
    const labourCharge = parseFloat(labourChargePerBag) || 0;
    const weightBag = parseFloat(transaction.weightPerBag) || 0;
    const extra = parseFloat(transaction.extraWeight) || 0;
    
    const regularLabour = bags * labourCharge;
    const extraLabour = weightBag > 0 ? (extra / weightBag) * labourCharge : 0;
    
    return Math.round((regularLabour + extraLabour) / 10) * 10;
  };

  // Aggregate calculations for all transactions
  const calculateTotalWeight = (): number => {
    return grainTransactions.reduce((sum, txn) => sum + calculateTransactionWeight(txn), 0);
  };

  const calculateGrossAmount = (): number => {
    return grainTransactions.reduce((sum, txn) => sum + calculateTransactionAmount(txn), 0);
  };

  const calculateTotalLabourCharges = (): number => {
    return grainTransactions.reduce((sum, txn) => sum + calculateTransactionLabourCharges(txn), 0);
  };

  const calculateTotalCommission = (): number => {
    const grossAmount = calculateGrossAmount();
    const commission = parseFloat(commissionPercent) || 0;
    const round = parseFloat(roundOff) || 0;
    return Math.round((commission * grossAmount) / 100) + round;
  };

  const calculateNetPayable = (): number => {
    const grossAmount = calculateGrossAmount();
    const labourCharges = calculateTotalLabourCharges();
    const commission = calculateTotalCommission();
    return grossAmount - (labourCharges + commission);
  };

  const calculateFinalNetPayable = (): number => {
    const netPayable = calculateNetPayable();
    const advance = parseFloat(advancePaid) || 0;
    return netPayable - advance;
  };

  const getPaymentStatus = (): PaymentStatus => {
    const finalPayable = calculateFinalNetPayable();
    const advance = parseFloat(advancePaid) || 0;
    
    if (advance === 0) return PaymentStatus.PENDING;
    if (finalPayable <= 0) return PaymentStatus.COMPLETED;
    return PaymentStatus.PARTIAL;
  };

  // Grain transaction management
  const addGrainTransaction = () => {
    const newId = (grainTransactions.length + 1).toString();
    setGrainTransactions([
      ...grainTransactions,
      {
        id: newId,
        grainType: '',
        numberOfBags: '',
        weightPerBag: '',
        extraWeight: '',
        pricePerQuintal: '',
      }
    ]);
  };

  const removeGrainTransaction = (id: string) => {
    if (grainTransactions.length === 1) {
      Alert.alert('Cannot Remove', 'At least one grain transaction is required');
      return;
    }
    setGrainTransactions(grainTransactions.filter(txn => txn.id !== id));
  };

  const updateGrainTransaction = (id: string, field: keyof GrainTransaction, value: string) => {
    setGrainTransactions(grainTransactions.map(txn => 
      txn.id === id ? { ...txn, [field]: value } : txn
    ));
  };

  const validateForm = (): boolean => {
    if (farmerPhone.length !== 10) {
      Alert.alert('Validation Error', 'Please enter valid 10-digit phone number');
      return false;
    }
    if (!farmerExists && !farmerName.trim()) {
      Alert.alert('Validation Error', 'Please enter farmer name');
      return false;
    }
    if (!farmerExists && !farmerAddress.trim()) {
      Alert.alert('Validation Error', 'Please enter farmer address');
      return false;
    }
    
    // Validate each grain transaction
    for (let i = 0; i < grainTransactions.length; i++) {
      const txn = grainTransactions[i];
      if (!txn.grainType.trim()) {
        Alert.alert('Validation Error', `Please enter grain type for transaction ${i + 1}`);
        return false;
      }
      if (!txn.numberOfBags || parseFloat(txn.numberOfBags) <= 0) {
        Alert.alert('Validation Error', `Please enter valid number of bags for transaction ${i + 1}`);
        return false;
      }
      if (!txn.weightPerBag || parseFloat(txn.weightPerBag) <= 0) {
        Alert.alert('Validation Error', `Please enter valid weight per bag for transaction ${i + 1}`);
        return false;
      }
      if (!txn.pricePerQuintal || parseFloat(txn.pricePerQuintal) <= 0) {
        Alert.alert('Validation Error', `Please enter valid price per quintal for transaction ${i + 1}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!farmerRepository) {
      Alert.alert('Error', 'System not ready. Please try again.');
      return;
    }

    // Check for active loans before saving
    if (activeLoanAmount > 0) {
      Alert.alert(
        'Active Loan Found',
        `${farmerName} has an outstanding loan of ₹${activeLoanAmount.toFixed(0)}.\n\nDo you want to proceed with the transaction?\n\nNote: Consider settling the loan before or after this transaction.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {},
          },
          {
            text: 'Proceed',
            onPress: () => saveTransaction(),
          },
        ],
      );
      return;
    }

    // No active loan, proceed directly
    await saveTransaction();
  };

  const saveTransaction = async () => {
    setLoading(true);
    try {
      // Save farmer if new
      if (!farmerExists) {
        await farmerRepository.create({
          phoneNumber: farmerPhone,
          name: farmerName.trim(),
          address: farmerAddress.trim(),
        });
      }

      // Create transaction
      const totalWeight = calculateTotalWeight();
      const grossAmount = calculateGrossAmount();
      const labourCharges = calculateTotalLabourCharges();
      const commission = calculateTotalCommission();
      const netPayable = calculateNetPayable();
      const finalPayable = calculateFinalNetPayable();
      const advance = parseFloat(advancePaid) || 0;

      // Create description with all transactions
      const description = grainTransactions.map((txn, idx) => 
        `[${idx + 1}] ${txn.grainType}: ${txn.numberOfBags} bags × ${txn.weightPerBag}kg + ${txn.extraWeight || 0}kg @ ₹${txn.pricePerQuintal}/qt`
      ).join('; ');

      // Calculate rate per quintal
      // For single grain: use its rate
      // For multiple grains: calculate weighted average rate
      const ratePerQuintal = grainTransactions.length === 1 
        ? parseFloat(grainTransactions[0].pricePerQuintal) || 0
        : totalWeight > 0 ? grossAmount / totalWeight : 0;

      await TransactionService.createBuyTransaction({
        supplierName: farmerName.trim(),
        supplierPhone: farmerPhone,
        grainType: grainTransactions.map(t => t.grainType).join(', '),
        quantity: parseFloat(totalWeight.toFixed(2)),
        ratePerQuintal: parseFloat(ratePerQuintal.toFixed(2)),
        totalAmount: grossAmount,
        paidAmount: advance,
        balanceAmount: finalPayable,
        paymentStatus: getPaymentStatus(),
        commissionAmount: commission,
        labourCharges: labourCharges,
        date: transactionDate.toISOString(),
        description,
      });

      Alert.alert(
        'Success',
        'Buy transaction created successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating buy transaction:', error);
      Alert.alert('Error', 'Failed to create transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalWeight = calculateTotalWeight();
  const grossAmount = calculateGrossAmount();
  const totalLabourCharges = calculateTotalLabourCharges();
  const totalCommission = calculateTotalCommission();
  const netPayable = calculateNetPayable();
  const finalNetPayable = calculateFinalNetPayable();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add Buy Transaction</Text>
          <Text style={styles.subtitle}>Purchase grain from farmer</Text>
        </View>

        {/* Transaction Date Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Transaction Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateButtonText}>📅 {formatDate(transactionDate)}</Text>
          </TouchableOpacity>
          <Text style={styles.hintText}>Tap to select date</Text>
        </View>

        {/* Calendar Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.calendarModal}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.calendarClose}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <Calendar
                maxDate={new Date().toISOString().split('T')[0]}
                onDayPress={(day: any) => handleDateChange(day.dateString)}
                markedDates={{
                  [transactionDate.toISOString().split('T')[0]]: {
                    selected: true,
                    selectedColor: Colors.primary,
                  },
                }}
                theme={{
                  backgroundColor: Colors.surface,
                  calendarBackground: Colors.surface,
                  textSectionTitleColor: Colors.textSecondary,
                  selectedDayBackgroundColor: Colors.primary,
                  selectedDayTextColor: Colors.textLight,
                  todayTextColor: Colors.primary,
                  dayTextColor: Colors.textPrimary,
                  textDisabledColor: Colors.textSecondary,
                  monthTextColor: Colors.textPrimary,
                  textMonthFontWeight: 'bold',
                  arrowColor: Colors.primary,
                }}
              />
              
              <View style={styles.calendarFooter}>
                <CustomButton
                  title="Cancel"
                  onPress={() => setShowDatePicker(false)}
                  variant="outline"
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Farmer Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧑‍🌾 Farmer Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <View style={styles.phoneInputContainer}>
              <TextInput
                style={[styles.input, checkingFarmer && styles.inputDisabled]}
                placeholder="Enter 10-digit phone number"
                placeholderTextColor={Colors.textSecondary}
                value={farmerPhone}
                onChangeText={setFarmerPhone}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!checkingFarmer}
              />
              {checkingFarmer && (
                <ActivityIndicator size="small" color={Colors.primary} style={styles.phoneLoader} />
              )}
            </View>
            {farmerExists && (
              <Text style={styles.successText}>✓ Farmer found in database</Text>
            )}
            {showFarmerFields && (
              <Text style={styles.infoText}>New farmer - Please enter details below</Text>
            )}
          </View>

          {(farmerExists || showFarmerFields) && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Farmer Name *</Text>
                <TextInput
                  style={[styles.input, farmerExists && styles.inputDisabled]}
                  placeholder="Enter farmer name"
                  placeholderTextColor={Colors.textSecondary}
                  value={farmerName}
                  onChangeText={setFarmerName}
                  editable={!farmerExists}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address *</Text>
                <TextInput
                  style={[styles.input, styles.textArea, farmerExists && styles.inputDisabled]}
                  placeholder="Enter farmer address"
                  placeholderTextColor={Colors.textSecondary}
                  value={farmerAddress}
                  onChangeText={setFarmerAddress}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  editable={!farmerExists}
                />
              </View>
            </>
          )}
        </View>

        {/* Grain Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🌾 Grain Details</Text>
          </View>
          
          {grainTransactions.map((transaction, index) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <Text style={styles.transactionNumber}>Transaction #{index + 1}</Text>
                {grainTransactions.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeGrainTransaction(transaction.id)}
                    style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>✕ Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Grain Type *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Wheat, Rice, Maize"
                  placeholderTextColor={Colors.textSecondary}
                  value={transaction.grainType}
                  onChangeText={(value) => updateGrainTransaction(transaction.id, 'grainType', value)}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>No. of Bags *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={Colors.textSecondary}
                    value={transaction.numberOfBags}
                    onChangeText={(value) => updateGrainTransaction(transaction.id, 'numberOfBags', value)}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Weight/Bag (Qtl) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={Colors.textSecondary}
                    value={transaction.weightPerBag}
                    onChangeText={(value) => updateGrainTransaction(transaction.id, 'weightPerBag', value)}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Extra Weight (Qtl)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={Colors.textSecondary}
                    value={transaction.extraWeight}
                    onChangeText={(value) => updateGrainTransaction(transaction.id, 'extraWeight', value)}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Price/Quintal (₹) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={Colors.textSecondary}
                    value={transaction.pricePerQuintal}
                    onChangeText={(value) => updateGrainTransaction(transaction.id, 'pricePerQuintal', value)}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.calculatedCard}>
                <View style={styles.calculatedRow}>
                  <Text style={styles.calculatedLabel}>Weight:</Text>
                  <Text style={styles.calculatedValue}>{calculateTransactionWeight(transaction).toFixed(2)} Qtl</Text>
                </View>
                <View style={styles.calculatedRow}>
                  <Text style={styles.calculatedLabel}>Amount:</Text>
                  <Text style={styles.calculatedValue}>₹{calculateTransactionAmount(transaction).toFixed(0)}</Text>
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addTransactionButton}
            onPress={addGrainTransaction}>
            <Text style={styles.addTransactionButtonText}>+ Add Transaction</Text>
          </TouchableOpacity>

          <View style={[styles.calculatedCard, styles.totalCard]}>
            <View style={styles.calculatedRow}>
              <Text style={styles.calculatedLabel}>Total Weight (Quintal):</Text>
              <Text style={styles.calculatedValue}>{totalWeight.toFixed(2)} Qtl</Text>
            </View>
            <View style={styles.calculatedRow}>
              <Text style={styles.calculatedLabel}>Total Amount:</Text>
              <Text style={styles.calculatedValue}>₹{grossAmount}</Text>
            </View>
            <View style={styles.calculatedRow}>
              <Text style={styles.calculatedLabel}>Average Price/Quintal:</Text>
              <Text style={styles.calculatedValue}>
                ₹{totalWeight > 0 ? (grossAmount / totalWeight).toFixed(2) : '0.00'}
              </Text>
            </View>
          </View>
        </View>

        {/* Fees & Charges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Fees & Charges</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Commission (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={Colors.textSecondary}
              value={commissionPercent}
              onChangeText={setCommissionPercent}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Labour Charge Per Bag (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={Colors.textSecondary}
              value={labourChargePerBag}
              onChangeText={setLabourChargePerBag}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.amountBreakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Gross Amount:</Text>
              <Text style={styles.breakdownValue}>₹ {grossAmount}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Total Labour Charges:</Text>
              <Text style={[styles.breakdownValue, styles.deductionValue]}>- ₹ {totalLabourCharges}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Total Commission:</Text>
              <Text style={[styles.breakdownValue, styles.deductionValue]}>- ₹ {totalCommission}</Text>
            </View>
            <View style={[styles.breakdownRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Net Payable:</Text>
              <Text style={styles.totalValue}>₹ {netPayable}</Text>
            </View>
          </View>
        </View>

        {/* Payments & Adjustment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Payments & Adjustment</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Advance Paid (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={Colors.textSecondary}
              value={advancePaid}
              onChangeText={setAdvancePaid}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Round Off (₹)</Text>
            <Text style={styles.helpText}>Enter positive to deduct, negative to add to commission</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={Colors.textSecondary}
              value={roundOff}
              onChangeText={setRoundOff}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.finalPayableCard}>
            <Text style={styles.finalPayableLabel}>Final Net Payable</Text>
            <Text style={styles.finalPayableValue}>₹ {finalNetPayable}</Text>
            <Text style={styles.statusBadge}>Status: {getPaymentStatus()}</Text>
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <CustomButton
            title={loading ? 'Saving Transaction...' : 'Save Transaction'}
            onPress={handleSubmit}
            disabled={loading}
          />
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body2,
    color: Colors.textSecondary,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: Colors.surface,
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
  hintText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
  calendarFooter: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
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
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: Colors.textSecondary,
  },
  textArea: {
    minHeight: 60,
    paddingTop: Spacing.sm,
  },
  phoneInputContainer: {
    position: 'relative',
  },
  phoneLoader: {
    position: 'absolute',
    right: Spacing.sm,
    top: Spacing.sm,
  },
  successText: {
    ...Typography.caption,
    color: Colors.success,
    marginTop: Spacing.xs,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  helpText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  halfWidth: {
    flex: 1,
  },
  calculatedCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  calculatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  calculatedLabel: {
    ...Typography.body2,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  calculatedValue: {
    ...Typography.h4,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  amountBreakdown: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  breakdownLabel: {
    ...Typography.body2,
    color: Colors.textSecondary,
  },
  breakdownValue: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  deductionValue: {
    color: Colors.error,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
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
  finalPayableCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  finalPayableLabel: {
    ...Typography.body1,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  finalPayableValue: {
    ...Typography.h1,
    color: Colors.textLight,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    ...Typography.caption,
    color: Colors.textLight,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  buttonContainer: {
    marginTop: Spacing.md,
  },
  cancelButton: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...Typography.button,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  transactionCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  transactionNumber: {
    ...Typography.body1,
    color: Colors.primary,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  removeButtonText: {
    ...Typography.caption,
    color: Colors.textLight,
    fontWeight: '600',
  },
  addTransactionButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addTransactionButtonText: {
    ...Typography.button,
    color: Colors.textLight,
    fontWeight: '600',
  },
  totalCard: {
    backgroundColor: Colors.secondary,
  },
});

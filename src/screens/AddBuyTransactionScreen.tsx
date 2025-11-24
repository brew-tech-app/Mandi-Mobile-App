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
} from 'react-native';
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
  
  // Grain Details
  const [grainType, setGrainType] = useState('');
  const [numberOfBags, setNumberOfBags] = useState('');
  const [weightPerBag, setWeightPerBag] = useState('');
  const [extraWeight, setExtraWeight] = useState('');
  const [pricePerQuintal, setPricePerQuintal] = useState('');
  
  // Fees & Charges
  const [commissionPercent, setCommissionPercent] = useState('');
  const [labourChargePerBag, setLabourChargePerBag] = useState('');
  
  // Payments & Adjustment
  const [advancePaid, setAdvancePaid] = useState('');
  const [roundOff, setRoundOff] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [farmerRepository, setFarmerRepository] = useState<FarmerRepository | null>(null);

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
    } catch (error) {
      console.error('Error checking farmer:', error);
    } finally {
      setCheckingFarmer(false);
    }
  };

  // Calculations
  const calculateTotalWeight = (): number => {
    const bags = parseFloat(numberOfBags) || 0;
    const weightBag = parseFloat(weightPerBag) || 0;
    const extra = parseFloat(extraWeight) || 0;
    return (bags * weightBag + extra) / 100;
  };

  const calculateGrossAmount = (): number => {
    const weight = calculateTotalWeight();
    const price = parseFloat(pricePerQuintal) || 0;
    return Math.round(weight * price);
  };

  const calculateTotalLabourCharges = (): number => {
    const bags = parseFloat(numberOfBags) || 0;
    const labourCharge = parseFloat(labourChargePerBag) || 0;
    const weightBag = parseFloat(weightPerBag) || 0;
    const extra = parseFloat(extraWeight) || 0;
    
    const regularLabour = bags * labourCharge;
    const extraLabour = weightBag > 0 ? (extra / weightBag) * labourCharge : 0;
    
    return Math.round((regularLabour + extraLabour) / 10) * 10;
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
    if (!grainType.trim()) {
      Alert.alert('Validation Error', 'Please enter grain type');
      return false;
    }
    if (!numberOfBags || parseFloat(numberOfBags) <= 0) {
      Alert.alert('Validation Error', 'Please enter valid number of bags');
      return false;
    }
    if (!weightPerBag || parseFloat(weightPerBag) <= 0) {
      Alert.alert('Validation Error', 'Please enter valid weight per bag');
      return false;
    }
    if (!pricePerQuintal || parseFloat(pricePerQuintal) <= 0) {
      Alert.alert('Validation Error', 'Please enter valid price per quintal');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!farmerRepository) {
      Alert.alert('Error', 'System not ready. Please try again.');
      return;
    }

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

      await TransactionService.createBuyTransaction({
        supplierName: farmerName.trim(),
        supplierPhone: farmerPhone,
        grainType: grainType.trim(),
        quantity: parseFloat(totalWeight.toFixed(2)),
        ratePerQuintal: parseFloat(pricePerQuintal),
        totalAmount: grossAmount,
        paidAmount: advance,
        balanceAmount: finalPayable,
        paymentStatus: getPaymentStatus(),
        commissionAmount: commission,
        labourCharges: labourCharges,
        date: new Date().toISOString(),
        description: `Bags: ${numberOfBags}, Weight/Bag: ${weightPerBag}, Extra: ${extraWeight}`,
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
          <Text style={styles.sectionTitle}>🌾 Grain Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Grain Type *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Wheat, Rice, Maize"
              placeholderTextColor={Colors.textSecondary}
              value={grainType}
              onChangeText={setGrainType}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>No. of Bags *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                value={numberOfBags}
                onChangeText={setNumberOfBags}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Weight/Bag (Qtl) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={Colors.textSecondary}
                value={weightPerBag}
                onChangeText={setWeightPerBag}
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
                value={extraWeight}
                onChangeText={setExtraWeight}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Price/Quintal (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={Colors.textSecondary}
                value={pricePerQuintal}
                onChangeText={setPricePerQuintal}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.calculatedCard}>
            <Text style={styles.calculatedLabel}>Total Weight (Quintal):</Text>
            <Text style={styles.calculatedValue}>{totalWeight.toFixed(2)} Qtl</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  calculatedLabel: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  calculatedValue: {
    ...Typography.h3,
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
});

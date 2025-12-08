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
import {MerchantRepository} from '../repositories/MerchantRepository';
import {CustomerRepository} from '../repositories/CustomerRepository';

type BillType = 'NORMAL' | 'BILL_OF_SUPPLY';
type PartyType = 'MERCHANT' | 'CUSTOMER';

/**
 * Add Sell Transaction Screen
 * Form to create new grain sale transaction
 */
export const AddSellTransactionScreen: React.FC<any> = ({navigation}) => {
  // Date & Bill Details
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [billType, setBillType] = useState<BillType>('NORMAL');
  const [partyType, setPartyType] = useState<PartyType>('MERCHANT');

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
  
  // Party Details
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firmName, setFirmName] = useState('');
  const [gstin, setGstin] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [partyExists, setPartyExists] = useState(false);
  const [checkingParty, setCheckingParty] = useState(false);
  const [showPartyFields, setShowPartyFields] = useState(false);
  
  // Grain Details - Support multiple transactions
  interface GrainTransaction {
    id: string;
    grainType: string;
    numberOfBags: string;
    weightPerBag: string;
    pricePerQuintal: string;
  }
  
  const [grainTransactions, setGrainTransactions] = useState<GrainTransaction[]>([
    {
      id: '1',
      grainType: '',
      numberOfBags: '',
      weightPerBag: '',
      pricePerQuintal: '',
    }
  ]);
  // When multiple transactions are present we can ask Grain Type once
  const [multiGrainType, setMultiGrainType] = useState('');
  
  // Fees & Charges
  const [commissionPercent, setCommissionPercent] = useState('');
  const [labourCharge, setLabourCharge] = useState('');
  
  // Bill of Supply Charges (for Merchant only)
  const [aratPercent, setAratPercent] = useState('');
  // Tulak: editable monetary amount (defaults to ₹1 per Quintal * total weight)
  const [tulakAmount, setTulakAmount] = useState('');
  const [mandiPercent, setMandiPercent] = useState('1.5');
  
  const [loading, setLoading] = useState(false);
  const [merchantRepository, setMerchantRepository] = useState<MerchantRepository | null>(null);
  const [customerRepository, setCustomerRepository] = useState<CustomerRepository | null>(null);

  useEffect(() => {
    initializeRepositories();
  }, []);

  // When user types a grain type in the shared `multiGrainType` field,
  // reflect it into individual grain transaction entries so saved
  // transactions have the correct `grainType` value.
  useEffect(() => {
    if (!multiGrainType) return;
    setGrainTransactions(prev => prev.map(txn => ({ ...txn, grainType: multiGrainType })));
  }, [multiGrainType]);

  const initializeRepositories = async () => {
    const db = await DatabaseService.initDatabase();
    setMerchantRepository(new MerchantRepository(db));
    setCustomerRepository(new CustomerRepository(db));
  };

  // Check party when phone number changes
  useEffect(() => {
    if (phoneNumber.length === 10) {
      checkPartyExists();
    } else {
      resetPartyDetails();
    }
  }, [phoneNumber, partyType]);

  // Tulak is computed dynamically; keep editable tulakAmount synced when weight changes
  useEffect(() => {
    const total = calculateTotalWeight();
    // default tulak rate is ₹1 per Qtl
    setTulakAmount((total * 1).toFixed(2));
  }, [grainTransactions]);
  const resetPartyDetails = () => {
    setPartyExists(false);
    setShowPartyFields(false);
    setFirmName('');
    setGstin('');
    setCustomerName('');
    setAddress('');
  };

  const checkPartyExists = async () => {
    if (partyType === 'MERCHANT' && !merchantRepository) return;
    if (partyType === 'CUSTOMER' && !customerRepository) return;
    
    setCheckingParty(true);
    try {
      if (partyType === 'MERCHANT') {
        const merchant = await merchantRepository!.findByPhoneNumber(phoneNumber);
        if (merchant) {
          setPartyExists(true);
          setFirmName(merchant.firmName);
          setGstin(merchant.gstin);
          setAddress(merchant.address);
          setShowPartyFields(false);
        } else {
          setPartyExists(false);
          setShowPartyFields(true);
        }
      } else {
        const customer = await customerRepository!.findByPhoneNumber(phoneNumber);
        if (customer) {
          setPartyExists(true);
          setCustomerName(customer.name);
          setAddress(customer.address);
          setShowPartyFields(false);
        } else {
          setPartyExists(false);
          setShowPartyFields(true);
        }
      }
    } catch (error) {
      console.error('Error checking party:', error);
    } finally {
      setCheckingParty(false);
    }
  };

  // Calculations for individual transaction
  const calculateTransactionWeight = (transaction: GrainTransaction): number => {
    const bags = parseFloat(transaction.numberOfBags) || 0;
    const weight = parseFloat(transaction.weightPerBag) || 0;
    return (bags * weight) / 100;
  };

  const calculateTransactionAmount = (transaction: GrainTransaction): number => {
    const weight = calculateTransactionWeight(transaction);
    const price = parseFloat(transaction.pricePerQuintal) || 0;
    return parseFloat((weight * price).toFixed(2));
  };

  // Total calculations
  const calculateTotalWeight = (): number => {
    return grainTransactions.reduce((sum, txn) => sum + calculateTransactionWeight(txn), 0);
  };

  const calculateGrossAmount = (): number => {
    return grainTransactions.reduce((sum, txn) => sum + calculateTransactionAmount(txn), 0);
  };

  const calculateCommission = (): number => {
    const grossAmount = calculateGrossAmount();
    const commission = parseFloat(commissionPercent) || 0;
    return parseFloat(((commission * grossAmount) / 100).toFixed(2));
  };

  // Bill of Supply calculations
  const calculateArat = (): number => {
    if (billType !== 'BILL_OF_SUPPLY' || partyType !== 'MERCHANT') return 0;
    const grossAmount = calculateGrossAmount();
    const arat = parseFloat(aratPercent) || 0;
    return parseFloat(((arat * grossAmount) / 100).toFixed(2));
  };

  const calculateMandiShulk = (): number => {
    if (billType !== 'BILL_OF_SUPPLY' || partyType !== 'MERCHANT') return 0;
    const grossAmount = calculateGrossAmount();
    const mandi = parseFloat(mandiPercent) || 0;
    return parseFloat(((mandi * grossAmount) / 100).toFixed(2));
  };

  const calculateNetReceivable = (): number => {
    const grossAmount = calculateGrossAmount();
    
      if (billType === 'BILL_OF_SUPPLY' && partyType === 'MERCHANT') {
      // Bill of Supply: Gross + Arat + Tulak(monetary) + Mandi Shulk
      const arat = calculateArat();
      // Tulak is editable monetary amount (falls back to ₹1 per Qtl * total weight)
      const tulakMonetary = parseFloat(tulakAmount) || (calculateTotalWeight() * 1);
      const mandiShulk = calculateMandiShulk();
      return parseFloat((grossAmount + arat + tulakMonetary + mandiShulk).toFixed(2));
    } else {
      // Normal: Gross + Commission + Labour
      const commission = calculateCommission();
      const labour = parseFloat(labourCharge) || 0;
      return parseFloat((grossAmount + commission + labour).toFixed(2));
    }
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
    if (phoneNumber.length !== 10) {
      Alert.alert('Validation Error', 'Please enter valid 10-digit phone number');
      return false;
    }
    
    if (partyType === 'MERCHANT') {
      if (!partyExists && !firmName.trim()) {
        Alert.alert('Validation Error', 'Please enter firm name');
        return false;
      }
      if (!partyExists && !gstin.trim()) {
        Alert.alert('Validation Error', 'Please enter GSTIN number');
        return false;
      }
    } else {
      if (!partyExists && !customerName.trim()) {
        Alert.alert('Validation Error', 'Please enter customer name');
        return false;
      }
    }
    
    if (!partyExists && !address.trim()) {
      Alert.alert('Validation Error', 'Please enter address');
      return false;
    }
    
    // Validate each grain transaction (or use multiGrainType when multiple)
    // Require a grain type for all cases (single or multiple items)
    if (!multiGrainType.trim()) {
      Alert.alert('Validation Error', `Please enter grain type for the transaction(s)`);
      return false;
    }

    for (let i = 0; i < grainTransactions.length; i++) {
      const txn = grainTransactions[i];
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
    if (partyType === 'MERCHANT' && !merchantRepository) {
      Alert.alert('Error', 'System not ready. Please try again.');
      return;
    }
    if (partyType === 'CUSTOMER' && !customerRepository) {
      Alert.alert('Error', 'System not ready. Please try again.');
      return;
    }

    setLoading(true);
    try {
      // Save party if new
      if (!partyExists) {
        if (partyType === 'MERCHANT') {
          await merchantRepository!.create({
            phoneNumber: phoneNumber,
            firmName: firmName.trim(),
            gstin: gstin.trim(),
            address: address.trim(),
          });
        } else {
          await customerRepository!.create({
            phoneNumber: phoneNumber,
            name: customerName.trim(),
            address: address.trim(),
          });
        }
      }

      // Create sell transactions for each grain transaction
      const totalWeight = calculateTotalWeight();
      const grossAmount = calculateGrossAmount();
      const netReceivable = calculateNetReceivable();
      // Precompute Bill of Supply related values (tulak is weight in Qtl)
          const arat = calculateArat();
          const mandiShulk = calculateMandiShulk();
          // Tulak is a monetary amount entered by user (₹)
          // Use editable tulakAmount, fallback to ₹1 per Quintal
          const tulakMonetaryTotal = parseFloat(tulakAmount) || (totalWeight * 1);

      const buyerName = partyType === 'MERCHANT' ? firmName.trim() : customerName.trim();
      
      // Calculate charges once for all transactions
      let commission = 0;
      let labour = 0;

      if (billType === 'BILL_OF_SUPPLY' && partyType === 'MERCHANT') {
        // Bill of Supply charges (tulak input is weight in Qtl -> convert to monetary)
        commission = arat + tulakMonetaryTotal + mandiShulk; // Store total additions in commission field
        labour = 0;
      } else {
        // Normal transaction charges
        commission = calculateCommission();
        labour = parseFloat(labourCharge) || 0;
      }

      // If this is Bill of Supply for a merchant, save as a single receipt containing all items
      if (billType === 'BILL_OF_SUPPLY' && partyType === 'MERCHANT') {
        // Build items array with proportional charges per item

        const items = grainTransactions.map(txn => {
          const txnWeight = calculateTransactionWeight(txn);
          const txnAmount = calculateTransactionAmount(txn);
          const txnArat = grossAmount > 0 ? (arat * txnAmount) / grossAmount : 0;
          // Distribute editable tulak amount proportionally by item weight
          const txnTulak = totalWeight > 0 ? (txnWeight / totalWeight) * tulakMonetaryTotal : 0;
          const txnMandi = grossAmount > 0 ? (mandiShulk * txnAmount) / grossAmount : 0;
          return {
            grainType: multiGrainType,
            numberOfBags: txn.numberOfBags,
            weightPerBag: txn.weightPerBag,
            pricePerQuintal: txn.pricePerQuintal,
            quantityQuintal: txnWeight,
            amount: parseFloat(txnAmount.toFixed(2)),
            arat: parseFloat(txnArat.toFixed(2)),
            tulak: parseFloat(txnTulak.toFixed(2)),
            mandi: parseFloat(txnMandi.toFixed(2)),
          };
        });

        // Encode items and meta as URI component to safely store in description
        const payload = {
          items,
          // meta keeps tulak as monetary amount (tulakAmount) for clarity
          meta: {
            tulakAmount: tulakMonetaryTotal,
            aratPercent: parseFloat(aratPercent) || 0,
            mandiPercent: parseFloat(mandiPercent) || 0,
          },
        };
        const itemsPayload = encodeURIComponent(JSON.stringify(payload));
        const description = `BillOfSupplyItems::${itemsPayload}`;

        await TransactionService.createSellTransaction({
          buyerName,
          buyerPhone: phoneNumber,
          grainType: multiGrainType || 'MULTI',
          quantity: totalWeight,
          ratePerQuintal: totalWeight > 0 ? parseFloat((grossAmount / totalWeight).toFixed(2)) : 0,
          totalAmount: grossAmount,
          receivedAmount: 0,
          balanceAmount: netReceivable,
          paymentStatus: PaymentStatus.PENDING,
          commissionAmount: commission, // store total additions in commission field
          labourCharges: labour,
          date: transactionDate.toISOString(),
          description,
        });
      } else {
        // Create a transaction for each grain type (normal behavior)
        for (const txn of grainTransactions) {
          const txnWeight = calculateTransactionWeight(txn);
          const txnAmount = calculateTransactionAmount(txn);
          
          // Calculate proportional charges for this transaction
          const txnCommission = grossAmount > 0 ? (commission * txnAmount) / grossAmount : 0;
          const txnLabour = grossAmount > 0 ? (labour * txnAmount) / grossAmount : 0;
          const txnNetReceivable = txnAmount + txnCommission + txnLabour;

          let description = '';
          if (billType === 'BILL_OF_SUPPLY' && partyType === 'MERCHANT') {
            const txnArat = grossAmount > 0 ? (arat * txnAmount) / grossAmount : 0;
            const txnTulak = grossAmount > 0 ? (tulakMonetaryTotal * txnAmount) / grossAmount : 0;
            const txnMandi = grossAmount > 0 ? (mandiShulk * txnAmount) / grossAmount : 0;
            description = `Bill of Supply: ${txn.grainType} - ${txn.numberOfBags} bags × ${txn.weightPerBag}kg @ ₹${txn.pricePerQuintal}/qt | Arat: ₹${txnArat.toFixed(2)}, Tulak: ₹${txnTulak.toFixed(2)}, Mandi Shulk: ₹${txnMandi.toFixed(2)}`;
          } else {
            // For Normal bill type, store grain details as a single-item BillOfSupplyItems payload
            const item = {
              grainType: txn.grainType,
              numberOfBags: txn.numberOfBags,
              weightPerBag: txn.weightPerBag,
              pricePerQuintal: txn.pricePerQuintal,
              quantityQuintal: txnWeight,
              amount: parseFloat(txnAmount.toFixed(2)),
            };
            const payload = { items: [item], meta: { normal: true } };
            description = `BillOfSupplyItems::${encodeURIComponent(JSON.stringify(payload))}`;
          }

          await TransactionService.createSellTransaction({
            buyerName,
            buyerPhone: phoneNumber,
            grainType: txn.grainType,
            quantity: txnWeight,
            ratePerQuintal: parseFloat(txn.pricePerQuintal) || 0,
            totalAmount: txnAmount,
            receivedAmount: 0,
            balanceAmount: txnNetReceivable,
            paymentStatus: PaymentStatus.PENDING,
            commissionAmount: txnCommission,
            labourCharges: txnLabour,
            date: transactionDate.toISOString(),
            description,
          });
        }
      }

      Alert.alert(
        'Success',
        'Sell transaction created successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating sell transaction:', error);
      Alert.alert('Error', 'Failed to create transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalWeight = calculateTotalWeight();
  const grossAmount = calculateGrossAmount();
  const commission = calculateCommission();
  const netReceivable = calculateNetReceivable();
  const avgRateDisplay = totalWeight > 0 ? grossAmount / totalWeight : 0;
  // Tulak display: show editable tulakAmount or default (₹1 per Qtl * total weight)
  const tulakMonetaryDisplay = parseFloat(tulakAmount) || (totalWeight * 1);
  // Total additions: Arat + Tulak + Mandi Shulk
  const totalAddition = parseFloat((calculateArat() + tulakMonetaryDisplay + calculateMandiShulk()).toFixed(2));

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
          <Text style={styles.title}>Add Sell Transaction</Text>
          <Text style={styles.subtitle}>Sale grain to merchant/customer</Text>
        </View>

        {/* Date Section */}
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

        {/* Bill Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Bill Type</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.typeButton, billType === 'NORMAL' && styles.typeButtonActive]}
              onPress={() => setBillType('NORMAL')}>
              <Text style={[styles.typeButtonText, billType === 'NORMAL' && styles.typeButtonTextActive]}>
                Normal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton, 
                billType === 'BILL_OF_SUPPLY' && styles.typeButtonActive,
                partyType === 'CUSTOMER' && styles.typeButtonDisabled
              ]}
              onPress={() => {
                if (partyType === 'CUSTOMER') {
                  Alert.alert('Not Allowed', 'Bill of Supply is only applicable for Merchants');
                  return;
                }
                setBillType('BILL_OF_SUPPLY');
              }}
              disabled={partyType === 'CUSTOMER'}>
              <Text style={[
                styles.typeButtonText, 
                billType === 'BILL_OF_SUPPLY' && styles.typeButtonTextActive,
                partyType === 'CUSTOMER' && styles.typeButtonTextDisabled
              ]}>
                Bill of Supply
              </Text>
            </TouchableOpacity>
          </View>
          {billType === 'BILL_OF_SUPPLY' && (
            <Text style={styles.hint}>Bill of Supply is only available for Merchant transactions</Text>
          )}
        </View>

        {/* Party Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Party Type</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.typeButton, partyType === 'MERCHANT' && styles.typeButtonActive]}
              onPress={() => {
                setPartyType('MERCHANT');
                resetPartyDetails();
              }}>
              <Text style={[styles.typeButtonText, partyType === 'MERCHANT' && styles.typeButtonTextActive]}>
                Merchant
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, partyType === 'CUSTOMER' && styles.typeButtonActive]}
              onPress={() => {
                setPartyType('CUSTOMER');
                resetPartyDetails();
                // Reset to NORMAL if Bill of Supply was selected
                if (billType === 'BILL_OF_SUPPLY') {
                  setBillType('NORMAL');
                }
              }}>
              <Text style={[styles.typeButtonText, partyType === 'CUSTOMER' && styles.typeButtonTextActive]}>
                Customer
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Party Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {partyType === 'MERCHANT' ? '🏢 Merchant Details' : '👤 Customer Details'}
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <View style={styles.phoneInputContainer}>
              <TextInput
                style={[styles.input, checkingParty && styles.inputDisabled]}
                placeholder="Enter 10-digit phone number"
                placeholderTextColor={Colors.textSecondary}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!checkingParty}
              />
              {checkingParty && (
                <ActivityIndicator size="small" color={Colors.primary} style={styles.phoneLoader} />
              )}
            </View>
            {partyExists && (
              <Text style={styles.successText}>
                ✓ {partyType === 'MERCHANT' ? 'Merchant' : 'Customer'} found in database
              </Text>
            )}
            {showPartyFields && (
              <Text style={styles.infoText}>
                New {partyType === 'MERCHANT' ? 'merchant' : 'customer'} - Please enter details below
              </Text>
            )}
          </View>

          {(partyExists || showPartyFields) && (
            <>
              {partyType === 'MERCHANT' ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Firm Name *</Text>
                    <TextInput
                      style={[styles.input, partyExists && styles.inputDisabled]}
                      placeholder="Enter firm name"
                      placeholderTextColor={Colors.textSecondary}
                      value={firmName}
                      onChangeText={setFirmName}
                      editable={!partyExists}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>GSTIN Number *</Text>
                    <TextInput
                      style={[styles.input, partyExists && styles.inputDisabled]}
                      placeholder="Enter GSTIN"
                      placeholderTextColor={Colors.textSecondary}
                      value={gstin}
                      onChangeText={setGstin}
                      editable={!partyExists}
                      autoCapitalize="characters"
                    />
                  </View>
                </>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Customer Name *</Text>
                  <TextInput
                    style={[styles.input, partyExists && styles.inputDisabled]}
                    placeholder="Enter customer name"
                    placeholderTextColor={Colors.textSecondary}
                    value={customerName}
                    onChangeText={setCustomerName}
                    editable={!partyExists}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address *</Text>
                <TextInput
                  style={[styles.input, styles.textArea, partyExists && styles.inputDisabled]}
                  placeholder="Enter address"
                  placeholderTextColor={Colors.textSecondary}
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                  editable={!partyExists}
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
          
          {/* Grain Type (applies to all items) - single control for single or multi items */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Grain Type *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Wheat, Rice, Maize"
              placeholderTextColor={Colors.textSecondary}
              value={multiGrainType}
              onChangeText={setMultiGrainType}
            />
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

              {/* Grain Type is provided above (multiGrainType) and applied to each item */}

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
                  <Text style={styles.label}>Weight/Bag (Kg) *</Text>
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price Per Quintal (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textSecondary}
                  value={transaction.pricePerQuintal}
                  onChangeText={(value) => updateGrainTransaction(transaction.id, 'pricePerQuintal', value)}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.calculatedCard}>
                <View style={styles.calculatedRow}>
                  <Text style={styles.calculatedLabel}>Weight:</Text>
                  <Text style={styles.calculatedValue}>{calculateTransactionWeight(transaction).toFixed(2)} Qtl</Text>
                </View>
                <View style={styles.calculatedRow}>
                  <Text style={styles.calculatedLabel}>Amount:</Text>
                  <Text style={styles.calculatedValue}>₹{calculateTransactionAmount(transaction).toFixed(2)}</Text>
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
              <Text style={styles.calculatedValue}>{calculateTotalWeight().toFixed(2)} Qtl</Text>
            </View>
            <View style={styles.calculatedRow}>
              <Text style={styles.calculatedLabel}>Gross Amount:</Text>
              <Text style={styles.calculatedValue}>₹{grossAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.calculatedRow}>
              <Text style={styles.calculatedLabel}>Average Price/Quintal:</Text>
              <Text style={styles.calculatedValue}>
                ₹{calculateTotalWeight() > 0 ? (grossAmount / calculateTotalWeight()).toFixed(2) : '0.00'}
              </Text>
            </View>
          </View>
        </View>

        {/* Fees & Charges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Fees & Charges</Text>
          
          {billType === 'BILL_OF_SUPPLY' && partyType === 'MERCHANT' ? (
            // Bill of Supply - Merchant charges
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Arat (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter arat percentage"
                  placeholderTextColor={Colors.textSecondary}
                  value={aratPercent}
                  onChangeText={setAratPercent}
                  keyboardType="decimal-pad"
                />
              </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Tulak (₹)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder={`${(totalWeight * 1).toFixed(2)}`}
                        placeholderTextColor={Colors.textSecondary}
                        value={tulakAmount}
                        onChangeText={setTulakAmount}
                        keyboardType="decimal-pad"
                      />
                      <Text style={styles.hint}>Updates automatically when weight changes</Text>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Mandi Shulk (%)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="1.5"
                        placeholderTextColor={Colors.textSecondary}
                        value={mandiPercent}
                        onChangeText={setMandiPercent}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.amountBreakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Gross Amount:</Text>
                  <Text style={styles.breakdownValue}>₹ {grossAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Arat:</Text>
                  <Text style={[styles.breakdownValue, styles.additionValue]}>+ ₹ {calculateArat().toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tulak:</Text>
                  <Text style={[styles.breakdownValue, styles.additionValue]}>₹{tulakMonetaryDisplay.toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Mandi Shulk ({parseFloat(mandiPercent || '0').toFixed(2)}%):</Text>
                  <Text style={[styles.breakdownValue, styles.additionValue]}>+ ₹ {calculateMandiShulk().toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Total Addition:</Text>
                  <Text style={[styles.breakdownValue, styles.additionValue]}>+ ₹ {totalAddition.toFixed(2)}</Text>
                </View>
                <View style={[styles.breakdownRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Net Receivable:</Text>
                  <Text style={styles.totalValue}>₹ {netReceivable.toFixed(2)}</Text>
                </View>
              </View>
            </>
          ) : (
            // Normal - Commission and Labour
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Commission (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter commission"
                  placeholderTextColor={Colors.textSecondary}
                  value={commissionPercent}
                  onChangeText={setCommissionPercent}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Labour Charge (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter labour charge"
                  placeholderTextColor={Colors.textSecondary}
                  value={labourCharge}
                  onChangeText={setLabourCharge}
                  keyboardType="decimal-pad"
                />
              </View>

              {billType === 'NORMAL' && (
                <View style={styles.amountBreakdown}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Gross Amount:</Text>
                    <Text style={styles.breakdownValue}>₹ {grossAmount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Commission:</Text>
                    <Text style={[styles.breakdownValue, styles.additionValue]}>+ ₹ {commission.toFixed(2)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Labour Charge:</Text>
                    <Text style={[styles.breakdownValue, styles.additionValue]}>+ ₹ {parseFloat(labourCharge || '0').toFixed(2)}</Text>
                  </View>
                  <View style={[styles.breakdownRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Net Receivable:</Text>
                    <Text style={styles.totalValue}>₹ {netReceivable.toFixed(2)}</Text>
                  </View>
                </View>
              )}
            </>
          )}
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
  hint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
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
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  halfWidth: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeButtonText: {
    ...Typography.body1,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: Colors.textLight,
  },
  typeButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  typeButtonTextDisabled: {
    color: '#BDBDBD',
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
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
    fontWeight: 'bold',
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
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addTransactionButtonText: {
    ...Typography.button,
    color: Colors.textLight,
    fontWeight: '600',
  },
  totalCard: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
    borderWidth: 2,
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
    ...Typography.body1,
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
  additionValue: {
    color: Colors.success,
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

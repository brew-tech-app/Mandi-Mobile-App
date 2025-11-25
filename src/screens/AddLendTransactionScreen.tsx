import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import {Calendar} from 'react-native-calendars';
import {Colors, Typography, Spacing, BorderRadius} from '../constants/theme';
import {CustomInput} from '../components/CustomInput';
import {CustomButton} from '../components/CustomButton';
import TransactionService from '../services/TransactionService';
import {PaymentStatus} from '../models/Transaction';
import {FarmerRepository} from '../repositories/FarmerRepository';
import DatabaseService from '../database/DatabaseService';

/**
 * Add Lend Transaction Screen
 * Form to create a new lend transaction
 */
export const AddLendTransactionScreen: React.FC<any> = ({navigation}) => {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [personName, setPersonName] = useState('');
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [farmerExists, setFarmerExists] = useState(false);
  const [activeLoansInfo, setActiveLoansInfo] = useState<string>('');

  const handleDateChange = (dateString: string) => {
    const selectedDate = new Date(dateString);
    setDate(selectedDate);
    setShowDatePicker(false);
  };

  const handlePhoneNumberChange = async (phone: string) => {
    setPhoneNumber(phone);
    
    // Search for farmer when phone number is 10 digits
    if (phone.length === 10) {
      try {
        const farmer = await TransactionService.getFarmerByPhone(phone);
        if (farmer) {
          setPersonName(farmer.name);
          setAddress(farmer.address);
          setFarmerExists(true);
          
          // Check for active lend transactions
          const lendTransactions = await TransactionService.getAllLendTransactions();
          const activeLoan = lendTransactions.find(
            t => t.personPhone === phone && t.balanceAmount > 0
          );
          
          if (activeLoan) {
            setActiveLoansInfo(
              `⚠️ Active loan exists!\n` +
              `Balance: ₹${activeLoan.balanceAmount.toFixed(2)}\n` +
              `Please settle existing loan before creating new one.`
            );
          } else {
            setActiveLoansInfo('');
          }
        } else {
          setPersonName('');
          setAddress('');
          setFarmerExists(false);
          setActiveLoansInfo('');
        }
      } catch (error) {
        console.error('Error fetching farmer:', error);
      }
    } else {
      setPersonName('');
      setAddress('');
      setFarmerExists(false);
      setActiveLoansInfo('');
    }
  };

  const validateForm = () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number');
      return false;
    }

    if (!personName.trim()) {
      Alert.alert('Validation Error', 'Please enter person name');
      return false;
    }

    if (!address.trim()) {
      Alert.alert('Validation Error', 'Please enter address');
      return false;
    }

    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount');
      return false;
    }

    const rateValue = parseFloat(interestRate);
    if (!interestRate || isNaN(rateValue) || rateValue < 0) {
      Alert.alert('Validation Error', 'Please enter a valid interest rate (0 or more)');
      return false;
    }

    if (activeLoansInfo) {
      Alert.alert(
        'Active Loan Exists',
        'This person has an active loan in Buy Transactions. Please settle it first before creating a new loan.',
        [{text: 'OK'}]
      );
      return false;
    }

    return true;
  };

  const handleSaveLoan = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Save farmer if not exists
      if (!farmerExists) {
        const db = DatabaseService.getDatabase();
        const farmerRepo = new FarmerRepository(db);
        await farmerRepo.create({
          name: personName.trim(),
          phoneNumber: phoneNumber,
          address: address.trim(),
        });
      }

      // Create lend transaction (interestRate stored in description for reference)
      const loanAmount = parseFloat(amount);
      const rate = parseFloat(interestRate);
      await TransactionService.createLendTransaction({
        date: date.toISOString(),
        personName: personName.trim(),
        personPhone: phoneNumber,
        lendType: 'MONEY',
        amount: loanAmount,
        description: `Loan Amount: ₹${loanAmount.toFixed(2)} | Interest Rate: ${rate}%`,
        returnedAmount: 0,
        returnedQuantity: 0,
        balanceAmount: loanAmount,
        balanceQuantity: 0,
        paymentStatus: PaymentStatus.PENDING,
      });

      Alert.alert('Success', 'Loan saved successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Error saving loan:', error);
      Alert.alert('Error', error.message || 'Failed to save loan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Date Picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateButtonText}>📅 {formatDate(date)}</Text>
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
                  [date.toISOString().split('T')[0]]: {
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
                  variant="secondary"
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Phone Number */}
        <View style={styles.section}>
          <CustomInput
            label="Phone Number *"
            value={phoneNumber}
            onChangeText={handlePhoneNumberChange}
            placeholder="Enter 10-digit phone number"
            keyboardType="phone-pad"
            maxLength={10}
          />
          {farmerExists && (
            <Text style={styles.successText}>✓ Farmer details found</Text>
          )}
        </View>

        {/* Active Loans Warning */}
        {activeLoansInfo && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>{activeLoansInfo}</Text>
          </View>
        )}

        {/* Person Name */}
        <View style={styles.section}>
          <CustomInput
            label="Name *"
            value={personName}
            onChangeText={setPersonName}
            placeholder="Enter person name"
            editable={!farmerExists}
          />
        </View>

        {/* Address */}
        <View style={styles.section}>
          <CustomInput
            label="Address *"
            value={address}
            onChangeText={setAddress}
            placeholder="Enter address"
            multiline
            numberOfLines={3}
            editable={!farmerExists}
          />
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <CustomInput
            label="Amount *"
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount to lend"
            keyboardType="decimal-pad"
          />
        </View>

        {/* Interest Rate */}
        <View style={styles.section}>
          <CustomInput
            label="Rate of Interest (%) *"
            value={interestRate}
            onChangeText={setInterestRate}
            placeholder="Enter interest rate"
            keyboardType="decimal-pad"
          />
          {interestRate && !isNaN(parseFloat(interestRate)) && (
            <Text style={styles.hintText}>
              Interest rate: {interestRate}% per month
            </Text>
          )}
        </View>

        {/* Save Button */}
        <CustomButton
          title="Save Loan"
          onPress={handleSaveLoan}
          loading={loading}
          disabled={loading || !!activeLoansInfo}
        />
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
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.body1,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
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
  successText: {
    ...Typography.caption,
    color: Colors.success,
    marginTop: Spacing.xs,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  warningText: {
    ...Typography.body2,
    color: '#92400E',
    lineHeight: 20,
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
});

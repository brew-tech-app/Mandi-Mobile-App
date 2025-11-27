import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import {Calendar} from 'react-native-calendars';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';
import {CustomInput} from '../components/CustomInput';
import {CustomButton} from '../components/CustomButton';
import ExpenseService from '../services/ExpenseService';

/**
 * Add Expense Transaction Screen
 * Allows users to record expense transactions
 */
export const AddExpenseTransactionScreen: React.FC<any> = ({navigation}) => {
  const [date, setDate] = useState(new Date());
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDateChange = (selectedDate: any) => {
    setDate(new Date(selectedDate.dateString));
    setShowCalendar(false);
  };

  const validateForm = (): boolean => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount');
      return false;
    }

    if (!notes.trim()) {
      Alert.alert('Validation Error', 'Please enter notes for the expense');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const expenseData = {
        date: date.toISOString(),
        amount: parseFloat(amount),
        notes: notes.trim(),
      };
      
      await ExpenseService.createExpense(expenseData);

      Alert.alert('Success', 'Expense recorded successfully', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setAmount('');
            setNotes('');
            setDate(new Date());
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating expense:', error);
      Alert.alert('Error', 'Failed to record expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Date *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowCalendar(true)}>
              <Text style={styles.dateButtonText}>📅 {formatDate(date)}</Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <CustomInput
              label="Amount *"
              placeholder="Enter amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <CustomInput
              label="Notes *"
              placeholder="Enter expense details (e.g., Transport, Wages, Rent)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              style={styles.notesInput}
            />
          </View>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <CustomButton
              title="Record Expense"
              onPress={handleSubmit}
              loading={loading}
            />
          </View>
        </View>
      </ScrollView>

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
              maxDate={new Date().toISOString().split('T')[0]}
              onDayPress={handleDateChange}
              markedDates={{
                [date.toISOString().split('T')[0]]: {
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
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.body1,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.small,
  },
  dateButtonText: {
    ...Typography.body1,
    color: Colors.textPrimary,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: Spacing.xl,
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
    ...Shadow.large,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.primary,
  },
  calendarTitle: {
    ...Typography.h4,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  calendarClose: {
    ...Typography.h3,
    color: Colors.textLight,
  },
});

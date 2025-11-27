import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {Calendar} from 'react-native-calendars';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';
import {Expense} from '../models/Expense';
import ExpenseService from '../services/ExpenseService';
import {useFocusEffect} from '@react-navigation/native';

/**
 * Expense Transactions List Screen
 * Displays all expense transactions
 */
export const ExpenseTransactionsListScreen: React.FC<any> = ({navigation}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [])
  );

  useEffect(() => {
    filterExpenses();
  }, [expenses, selectedDate]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await ExpenseService.getAllExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterExpenses = () => {
    let filtered = expenses;

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.date).toISOString().split('T')[0];
        return expenseDate === selectedDate;
      });
    }

    setFilteredExpenses(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadExpenses();
  };

  const handleDeleteExpense = (expense: Expense) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete this expense of ₹${expense.amount.toFixed(2)}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ExpenseService.deleteExpense(expense.id);
              Alert.alert('Success', 'Expense deleted successfully');
              loadExpenses();
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateTotal = (): number => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const handleEditExpense = (expense: Expense) => {
    // TODO: Navigate to edit screen when implemented
    Alert.alert('Edit Expense', 'Edit functionality coming soon!');
  };

  const renderExpenseItem = ({item}: {item: Expense}) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{formatDate(item.date)}</Text>
        <Text style={styles.amount}>₹{item.amount.toFixed(2)}</Text>
      </View>
      <Text style={styles.notes} numberOfLines={2}>
        {item.notes}
      </Text>
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditExpense(item)}>
          <Text style={styles.actionButtonText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteExpense(item)}>
          <Text style={styles.actionButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💸</Text>
      <Text style={styles.emptyText}>No expenses recorded yet</Text>
      <Text style={styles.emptySubtext}>Tap the + button to add an expense</Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.dateFilterContainer}>
        <TouchableOpacity
          style={[styles.dateButton, selectedDate ? styles.dateButtonActive : null]}
          onPress={() => setShowCalendar(true)}>
          <Text style={styles.dateButtonText}>
            {selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', {day: '2-digit', month: 'short'}) : '📅 Filter by Date'}
          </Text>
        </TouchableOpacity>
        {selectedDate && (
          <TouchableOpacity
            style={styles.clearDateButton}
            onPress={() => setSelectedDate(null)}>
            <Text style={styles.dateButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>
          {selectedDate ? `Expenses on ${new Date(selectedDate).toLocaleDateString('en-IN')}` : 'Total Expenses'}
        </Text>
        <Text style={styles.summaryValue}>₹{calculateTotal().toFixed(2)}</Text>
        <Text style={styles.summaryCount}>
          {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
              onDayPress={(day: {dateString: string}) => {
                setSelectedDate(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={
                selectedDate
                  ? {
                      [selectedDate]: {
                        selected: true,
                        selectedColor: Colors.primary,
                      },
                    }
                  : {}
              }
              theme={{
                backgroundColor: Colors.surface,
                calendarBackground: Colors.surface,
                textSectionTitleColor: Colors.textPrimary,
                selectedDayBackgroundColor: Colors.primary,
                selectedDayTextColor: Colors.surface,
                todayTextColor: Colors.primary,
                dayTextColor: Colors.textPrimary,
                textDisabledColor: Colors.textSecondary,
                monthTextColor: Colors.textPrimary,
                arrowColor: Colors.primary,
              }}
            />
          </View>
        </View>
      </Modal>

      <FlatList
        data={filteredExpenses}
        renderItem={renderExpenseItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={filteredExpenses.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpenseTransaction')}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
  list: {
    padding: Spacing.md,
  },
  emptyList: {
    flexGrow: 1,
  },
  header: {
    marginBottom: Spacing.md,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dateButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.small,
  },
  dateButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateButtonText: {
    ...Typography.body2,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  clearDateButton: {
    backgroundColor: Colors.error,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: Spacing.md,
    width: '90%',
    maxWidth: 400,
    ...Shadow.large,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  calendarTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  calendarClose: {
    ...Typography.h3,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.sm,
  },
  summaryCard: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadow.medium,
  },
  summaryLabel: {
    ...Typography.body2,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    ...Typography.h2,
    color: Colors.textLight,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  summaryCount: {
    ...Typography.caption,
    color: Colors.textLight,
    opacity: 0.9,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  date: {
    ...Typography.body2,
    color: Colors.textSecondary,
  },
  amount: {
    ...Typography.h4,
    color: Colors.error,
    fontWeight: 'bold',
  },
  notes: {
    ...Typography.body1,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    ...Typography.body2,
    color: Colors.textLight,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.h4,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    ...Typography.body2,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.large,
  },
  fabIcon: {
    fontSize: 32,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
});

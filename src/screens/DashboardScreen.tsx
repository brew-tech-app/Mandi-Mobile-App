import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, StatusBar, Modal, Alert} from 'react-native';
import {SummaryCard} from '../components/SummaryCard';
import {TransactionCard} from '../components/TransactionCard';
import {FloatingActionButton} from '../components/FloatingActionButton';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';
import TransactionService from '../services/TransactionService';
import {DashboardSummary} from '../models/Transaction';
import {formatCurrency, formatQuantity, formatDate} from '../utils/helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';
import DailyResetService from '../services/DailyResetService';
import CashBalanceService from '../services/CashBalanceService';

/**
 * Dashboard Screen - Grain Ledger
 * Modern UI with operational summary and comprehensive metrics
 */
export const DashboardScreen: React.FC<any> = ({navigation}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'daily' | 'monthly' | 'quarterly' | 'custom'>('daily');
  const [currentCashBalance, setCurrentCashBalance] = useState<number>(0);
  const [isBalanceModalVisible, setIsBalanceModalVisible] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [dateRange, setDateRange] = useState({start: new Date(), end: new Date()});

  const loadDashboardData = async () => {
    try {
      // Check and perform daily reset if needed
      const wasReset = await DailyResetService.checkAndResetIfNewDay();
      if (wasReset) {
        console.log('Daily reset performed');
      }
      
      // Load data based on selected tab
      await loadSummaryByTab();
      
      // Load current cash balance
      const balance = await CashBalanceService.getCurrentBalance();
      setCurrentCashBalance(balance);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSummaryByTab = async () => {
    try {
      let data: DashboardSummary;
      
      switch (selectedTab) {
        case 'daily':
          data = await TransactionService.getDailyOperationalSummary();
          break;
        case 'monthly':
          data = await TransactionService.getMonthlyOperationalSummary();
          break;
        case 'quarterly':
          data = await TransactionService.getQuarterlyOperationalSummary();
          break;
        case 'custom':
          data = await TransactionService.getDashboardSummaryByDateRange(
            dateRange.start,
            dateRange.end,
          );
          break;
        default:
          data = await TransactionService.getDailyOperationalSummary();
      }
      
      setSummary(data);
    } catch (error) {
      console.error('Error loading summary by tab:', error);
      throw error;
    }
  };

  const updateCashBalance = async () => {
    const newBalance = parseFloat(balanceInput);
    if (isNaN(newBalance)) {
      Alert.alert('Invalid Input', 'Please enter a valid number');
      return;
    }
    
    try {
      const success = await CashBalanceService.setBalance(newBalance);
      if (success) {
        setCurrentCashBalance(newBalance);
        setIsBalanceModalVisible(false);
        setBalanceInput('');
        Alert.alert('Success', 'Cash balance updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update cash balance');
      }
    } catch (error) {
      console.error('Error updating balance:', error);
      Alert.alert('Error', 'Failed to update cash balance');
    }
  };

  const calculateDateRange = () => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (selectedTab) {
      case 'daily':
        start = new Date(today.setHours(0, 0, 0, 0));
        end = new Date(today.setHours(23, 59, 59, 999));
        break;
      case 'monthly':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'quarterly':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = new Date(today.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
        break;
      case 'custom':
        // Use existing dateRange state
        start = dateRange.start;
        end = dateRange.end;
        break;
    }

    setDateRange({start, end});
    return {start, end};
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    calculateDateRange();
    loadSummaryByTab();
  }, [selectedTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const fabItems = [
    {
      label: 'Buy Transaction',
      color: Colors.buy,
      onPress: () => navigation.navigate('BuyTransactions', {
        screen: 'AddBuyTransaction'
      }),
    },
    {
      label: 'Sell Transaction',
      color: Colors.sell,
      onPress: () => navigation.navigate('AddSellTransaction'),
    },
    {
      label: 'Lend Transaction',
      color: Colors.lend,
      onPress: () => navigation.navigate('AddLendTransaction'),
    },
    {
      label: 'Expense Transaction',
      color: Colors.expense,
      onPress: () => navigation.navigate('AddExpenseTransaction'),
    },
  ];

  const profit = summary?.profit || 0;
  const isProfitable = profit > 0;
  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);
  
  // Calculate running totals
  const totalStock = 0; // This should be calculated from inventory/stock management
  const runningLoans = summary?.totalPendingLendAmount || 0;
  const runningPayables = summary?.totalPendingBuyAmount || 0;
  const runningReceivables = summary?.totalPendingSellAmount || 0;

  const tabs = [
    {key: 'daily', label: 'Daily'},
    {key: 'monthly', label: 'Monthly'},
    {key: 'quarterly', label: 'Quarterly'},
    {key: 'custom', label: 'Custom'},
  ] as const;

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Header Section with Gradient */}
      <View style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Grain Ledger</Text>
          <Text style={styles.headerSubtitle}>HOME</Text>
        </View>
        
        {/* Search Bar - Positioned at bottom of header */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions by Phone Number..."
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }>

        {/* Current Balance Card */}
        <TouchableOpacity 
          style={styles.balanceCard}
          onPress={() => setIsBalanceModalVisible(true)}
          activeOpacity={0.8}>
          <Text style={styles.balanceLabel}>Current Cash Balance</Text>
          <Text style={styles.balanceSubLabel}>(Tap to update)</Text>
          <View style={styles.balanceAmountContainer}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <Text style={styles.balanceAmount}>{currentCashBalance.toFixed(2)}</Text>
          </View>
        </TouchableOpacity>

        {/* Operational Summary Header */}
        <View style={styles.section}>
          <Text style={styles.operationalTitle}>
            {selectedTab === 'daily' ? 'Daily Operational Summary' : 
             selectedTab === 'monthly' ? 'Monthly Operational Summary' :
             selectedTab === 'quarterly' ? 'Quarterly Operational Summary' :
             'Custom Operational Summary'}
          </Text>
          <Text style={styles.operationalSubtitle}>
            {startDate} - {endDate}
          </Text>
          {selectedTab === 'daily' && (
            <Text style={styles.operationalNote}>
              * Resets daily at midnight
            </Text>
          )}
          
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  selectedTab === tab.key && styles.tabActive,
                ]}
                onPress={() => setSelectedTab(tab.key)}>
                <Text
                  style={[
                    styles.tabText,
                    selectedTab === tab.key && styles.tabTextActive,
                  ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Two Column Layout */}
        <View style={styles.twoColumnContainer}>
          {/* Left Stack */}
          <View style={styles.leftStack}>
            {/* Total Purchases */}
            <View style={[styles.stackCard, styles.yellowCard]}>
              <Text style={styles.metricIcon}>💰</Text>
              <Text style={styles.metricValue}>{formatCurrency(summary?.totalBuyAmount || 0)}</Text>
              <Text style={styles.metricLabel}>Total Purchases (Cost)</Text>
            </View>

            {/* Net Profit/Loss */}
            <View style={[styles.stackCard, {backgroundColor: isProfitable ? '#DCFCE7' : '#FEE2E2'}]}>
              <Text style={styles.metricIcon}>{isProfitable ? '📊' : '📉'}</Text>
              <Text style={[styles.metricValue, {color: isProfitable ? Colors.success : Colors.error}]}>
                {formatCurrency(profit)}
              </Text>
              <Text style={styles.metricLabel}>Net Profit/Loss {isProfitable ? '↗' : '↘'}</Text>
            </View>

            {/* Stock - Running Total */}
            <View style={[styles.stackCard, styles.blueCard]}>
              <Text style={styles.metricIcon}>📋</Text>
              <Text style={styles.metricValue}>{totalStock.toFixed(2)} Qtl</Text>
              <Text style={styles.metricLabel}>Stock (Running Total)</Text>
            </View>

            {/* Total Payables - Running Total */}
            <View style={[styles.stackCard, styles.redLightCard]}>
              <Text style={styles.metricIcon}>📅</Text>
              <Text style={[styles.metricValue, {color: Colors.error}]}>
                {formatCurrency(runningPayables)}
              </Text>
              <Text style={styles.metricLabel}>Total Payables (Running)</Text>
            </View>
          </View>

          {/* Right Stack */}
          <View style={styles.rightStack}>
            {/* Total Sales */}
            <View style={[styles.stackCard, styles.greenCard]}>
              <Text style={styles.metricIcon}>📈</Text>
              <Text style={styles.metricValue}>{formatCurrency(summary?.totalSellAmount || 0)}</Text>
              <Text style={styles.metricLabel}>Total Sales</Text>
            </View>

            {/* Labour Charges */}
            <View style={[styles.stackCard, styles.purpleCard]}>
              <Text style={styles.metricIcon}>🕐</Text>
              <Text style={styles.metricValue}>{formatCurrency(summary?.totalBuyLabourCharges || 0)}</Text>
              <Text style={styles.metricLabel}>Total Labour Charges</Text>
            </View>

            {/* Outstanding Loans - Running Total */}
            <View style={[styles.stackCard, styles.redCard]}>
              <Text style={styles.metricIcon}>📉</Text>
              <Text style={styles.metricValue}>{formatCurrency(runningLoans)}</Text>
              <Text style={styles.metricLabel}>Outstanding Loans (Running)</Text>
            </View>

            {/* Total Receivables - Running Total */}
            <View style={[styles.stackCard, styles.greenLightCard]}>
              <Text style={styles.metricIcon}>💵</Text>
              <Text style={[styles.metricValue, {color: Colors.success}]}>
                {formatCurrency(runningReceivables)}
              </Text>
              <Text style={styles.metricLabel}>Total Receivables (Running)</Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacing for FAB */}
        <View style={{height: 100}} />
      </ScrollView>

      <FloatingActionButton items={fabItems} />

      {/* Cash Balance Update Modal */}
      <Modal
        visible={isBalanceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBalanceModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Cash Balance</Text>
            <Text style={styles.modalSubtitle}>Enter your current cash balance</Text>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalRupee}>₹</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={balanceInput}
                onChangeText={setBalanceInput}
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setIsBalanceModalVisible(false);
                  setBalanceInput('');
                }}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={updateCashBalance}>
                <Text style={[styles.modalButtonText, {color: Colors.textLight}]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  loadingText: {
    ...Typography.body1,
    textAlign: 'center',
    marginTop: Spacing.xl,
    color: Colors.textSecondary,
  },
  
  // Header with Gradient
  headerGradient: {
    backgroundColor: Colors.primary,
    paddingTop: 40,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    ...Shadow.large,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    opacity: 0.9,
    letterSpacing: 2,
  },
  
  // Search Bar
  searchContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body2,
    color: Colors.textPrimary,
  },
  
  // Balance Card
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    ...Shadow.medium,
  },
  balanceLabel: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  balanceSubLabel: {
    color: Colors.textLight,
    fontSize: 12,
    opacity: 0.7,
    marginBottom: Spacing.md,
  },
  balanceAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rupeeSymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginRight: Spacing.xs,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  
  // Operational Summary
  operationalTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  operationalSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  operationalNote: {
    ...Typography.caption,
    color: Colors.warning,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textLight,
  },
  
  // Two Column Layout
  twoColumnContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  leftStack: {
    flex: 1,
    gap: Spacing.sm,
  },
  rightStack: {
    flex: 1,
    gap: Spacing.sm,
  },
  stackCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadow.small,
  },
  
  // Metrics Grid (Backup)
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  metricCard: {
    width: '48%',
    margin: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadow.small,
  },
  yellowCard: {
    backgroundColor: '#FEF3C7',
  },
  greenCard: {
    backgroundColor: '#DCFCE7',
  },
  purpleCard: {
    backgroundColor: '#F3E8FF',
  },
  blueCard: {
    backgroundColor: '#DBEAFE',
  },
  redCard: {
    backgroundColor: '#FEE2E2',
  },
  redLightCard: {
    backgroundColor: '#FEF2F2',
  },
  greenLightCard: {
    backgroundColor: '#F0FDF4',
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  metricValue: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  
  // Section
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeading: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  
  // Info Cards
  infoCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadow.small,
  },
  infoIcon: {
    fontSize: 28,
    marginBottom: Spacing.sm,
  },
  infoValue: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  infoLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    ...Shadow.large,
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

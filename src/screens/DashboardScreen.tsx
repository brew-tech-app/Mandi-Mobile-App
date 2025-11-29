import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, StatusBar, Modal, Alert} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Calendar} from 'react-native-calendars';
import {SummaryCard} from '../components/SummaryCard';
import {TransactionCard} from '../components/TransactionCard';
import {FloatingActionButton} from '../components/FloatingActionButton';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';
import TransactionService, {StockByGrainType} from '../services/TransactionService';
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [totalStock, setTotalStock] = useState<number>(0);
  const [stockByGrainType, setStockByGrainType] = useState<StockByGrainType[]>([]);
  const [isStockModalVisible, setIsStockModalVisible] = useState(false);
  const [isProfitModalVisible, setIsProfitModalVisible] = useState(false);
  const [profitTab, setProfitTab] = useState<'buy' | 'sell' | 'interest'>('buy');
  const [isLabourModalVisible, setIsLabourModalVisible] = useState(false);
  const [labourTransactions, setLabourTransactions] = useState<any[]>([]);
  const [loadingLabour, setLoadingLabour] = useState(false);

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

      // Load stock summary
      const stock = await TransactionService.getStockSummary();
      setTotalStock(stock);

      // Load stock by grain type
      const stockBreakdown = await TransactionService.getStockByGrainType();
      setStockByGrainType(stockBreakdown);
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
          if (selectedDate) {
            // For single date, set both start and end to the same date
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);
            data = await TransactionService.getDashboardSummaryByDateRange(
              selectedDate,
              endOfDay,
            );
          } else {
            // Default to today if no date selected
            data = await TransactionService.getDailyOperationalSummary();
          }
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
        // For custom, don't update dateRange to avoid infinite loop
        return {start: dateRange.start, end: dateRange.end};
    }

    setDateRange({start, end});
    return {start, end};
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (selectedTab !== 'custom') {
      calculateDateRange();
    }
    loadSummaryByTab();
  }, [selectedTab, selectedDate]);

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
      label: 'Buy',
      color: Colors.buy,
      icon: 'cart-plus',
      onPress: () => navigation.navigate('AddBuyTransactionModal'),
    },
    {
      label: 'Sell',
      color: Colors.sell,
      icon: 'cash-register',
      onPress: () => navigation.navigate('AddSellTransactionModal'),
    },
    {
      label: 'Lend',
      color: Colors.lend,
      icon: 'hand-coin',
      onPress: () => navigation.navigate('AddLendTransactionModal'),
    },
    {
      label: 'Expense',
      color: Colors.expense,
      icon: 'receipt-text',
      onPress: () => navigation.navigate('AddExpenseTransactionModal'),
    },
  ];

  const profit = summary?.profit || 0;
  const isProfitable = profit > 0;
  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);
  
  // Calculate running totals
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
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  navigation.navigate('BuyTransactions', {
                    screen: 'BuyTransactionsList',
                    params: { searchPhone: searchQuery.trim() }
                  });
                  setSearchQuery('');
                }
              }}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}>
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
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

          {/* Custom Date Picker Section */}
          {selectedTab === 'custom' && (
            <View style={styles.customDateSection}>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setIsDatePickerVisible(true)}>
                <Icon name="calendar-month" size={24} color={Colors.primary} />
                <Text style={styles.datePickerButtonText}>
                  {selectedDate
                    ? `📅 ${formatDate(selectedDate.toISOString())}`
                    : '📅 Select Date to View Summary'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.datePickerHint}>Tap to select a date</Text>
            </View>
          )}
        </View>

        {/* Daily Operational Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Daily Operational Summary</Text>
          
          {/* Row 1 */}
          <View style={styles.cardRow}>
            {/* Total Purchases */}
            <View style={[styles.stackCard, styles.yellowCard]}>
              <Icon name="wallet" size={32} color={Colors.warning} style={styles.metricIcon} />
              <Text style={styles.metricValue}>{formatCurrency(summary?.totalBuyAmount || 0)}</Text>
              <Text style={styles.metricLabel}>Total Purchases (Net Payable)</Text>
            </View>

            {/* Total Sales */}
            <View style={[styles.stackCard, styles.greenCard]}>
              <Icon name="trending-up" size={32} color={Colors.success} style={styles.metricIcon} />
              <Text style={styles.metricValue}>{formatCurrency(summary?.totalSellAmount || 0)}</Text>
              <Text style={styles.metricLabel}>Total Sales (Net Receivable)</Text>
            </View>
          </View>

          {/* Row 2 */}
          <View style={styles.cardRow}>
            {/* Net Profit/Loss */}
            <TouchableOpacity 
              style={[styles.stackCard, {backgroundColor: isProfitable ? '#DCFCE7' : '#FEE2E2'}]}
              onPress={() => setIsProfitModalVisible(true)}
              activeOpacity={0.8}>
              <Icon name={isProfitable ? "chart-line" : "chart-line-variant"} size={32} color={isProfitable ? Colors.success : Colors.error} style={styles.metricIcon} />
              <Text style={[styles.metricValue, {color: isProfitable ? Colors.success : Colors.error}]}>
                {formatCurrency(profit)}
              </Text>
              <Text style={styles.metricLabel}>Net Profit/Loss {isProfitable ? '↗' : '↘'}</Text>
              <Text style={styles.tapHint}>Tap to view breakdown</Text>
            </TouchableOpacity>

            {/* Total Expenses */}
            <TouchableOpacity 
              style={[styles.stackCard, styles.expenseCard]}
              onPress={() => navigation.navigate('Expense')}
              activeOpacity={0.8}>
              <Icon name="receipt" size={32} color={Colors.expense} style={styles.metricIcon} />
              <Text style={styles.metricValue}>{formatCurrency(summary?.totalExpenseAmount || 0)}</Text>
              <Text style={styles.metricLabel}>Total Expenses</Text>
              <Text style={styles.tapHint}>Tap to view details</Text>
            </TouchableOpacity>

            {/* Labour Charges */}
            <TouchableOpacity 
              style={[styles.stackCard, styles.purpleCard]}
              onPress={async () => {
                setIsLabourModalVisible(true);
                setLoadingLabour(true);
                try {
                  const transactions = await TransactionService.getAllBuyTransactions();
                  const labourTxns = transactions
                    .filter((t: any) => (t.labourCharges || 0) > 0)
                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  setLabourTransactions(labourTxns);
                } catch (error) {
                  console.error('Error loading labour transactions:', error);
                } finally {
                  setLoadingLabour(false);
                }
              }}
              activeOpacity={0.8}>
              <Icon name="account-clock" size={32} color={Colors.purple} style={styles.metricIcon} />
              <Text style={styles.metricValue}>{formatCurrency(summary?.totalBuyLabourCharges || 0)}</Text>
              <Text style={styles.metricLabel}>Total Labour Charges</Text>
              <Text style={styles.tapHint}>Tap to view details</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stocks & Loans */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Stocks & Loans</Text>
          
          {/* Row 3 */}
          <View style={styles.cardRow}>
            {/* Stock - Running Total */}
            <TouchableOpacity 
              style={[styles.stackCard, styles.blueCard]}
              onPress={() => setIsStockModalVisible(true)}
              activeOpacity={0.8}>
              <Icon name="package-variant" size={32} color={Colors.blue} style={styles.metricIcon} />
              <Text style={styles.metricValue}>{totalStock.toFixed(2)} Qtl</Text>
              <Text style={styles.metricLabel}>Stock (Running Total)</Text>
              <Text style={styles.tapHint}>Tap to view by grain type</Text>
            </TouchableOpacity>

            {/* Outstanding Loans - Running Total */}
            <View style={[styles.stackCard, styles.redCard]}>
              <Icon name="hand-coin" size={32} color={Colors.error} style={styles.metricIcon} />
              <Text style={styles.metricValue}>{formatCurrency(runningLoans)}</Text>
              <Text style={styles.metricLabel}>Outstanding Loans (Running)</Text>
            </View>
          </View>
        </View>

        {/* Payables & Receivables */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Payables & Receivables</Text>
          
          {/* Row 4 */}
          <View style={styles.cardRow}>
            {/* Total Payables - Running Total */}
            <View style={[styles.stackCard, styles.redLightCard]}>
              <Icon name="calendar-clock" size={32} color={Colors.error} style={styles.metricIcon} />
              <Text style={[styles.metricValue, {color: Colors.error}]}>
                {formatCurrency(runningPayables)}
              </Text>
              <Text style={styles.metricLabel}>Total Payables (Running)</Text>
            </View>

            {/* Total Receivables - Running Total */}
            <View style={[styles.stackCard, styles.greenLightCard]}>
              <Icon name="cash-multiple" size={32} color={Colors.success} style={styles.metricIcon} />
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

      {/* Stock Detail Modal */}
      <Modal
        visible={isStockModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsStockModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.stockModalContent}>
            <Text style={styles.modalTitle}>Stock Breakdown</Text>
            <Text style={styles.stockTotalText}>
              Total Stock: {totalStock.toFixed(2)} Qtl
            </Text>
            
            <ScrollView style={styles.stockListContainer} showsVerticalScrollIndicator={false}>
              {stockByGrainType.length > 0 ? (
                stockByGrainType.map((item, index) => (
                  <View key={index} style={styles.stockItem}>
                    <View style={styles.stockItemLeft}>
                      <Text style={styles.stockGrainIcon}>🌾</Text>
                      <Text style={styles.stockGrainName}>{item.grainType}</Text>
                    </View>
                    <View style={styles.stockItemRight}>
                      <Text style={[
                        styles.stockQuantity,
                        item.stock < 0 && styles.stockNegative
                      ]}>
                        {item.stock.toFixed(2)} Qtl
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyStockText}>No stock available</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.stockCloseButton}
              onPress={() => setIsStockModalVisible(false)}>
              <Text style={styles.stockCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Profit Breakdown Modal */}
      <Modal
        visible={isProfitModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsProfitModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.profitModalContent}>
            <Text style={styles.modalTitle}>Profit/Loss Breakdown</Text>
            <Text style={styles.profitTotalText}>
              Net Profit/Loss: {formatCurrency(profit)}
            </Text>
            
            {/* Tabs */}
            <View style={styles.profitTabContainer}>
              <TouchableOpacity
                style={[styles.profitTab, profitTab === 'buy' && styles.profitTabActive]}
                onPress={() => setProfitTab('buy')}>
                <Text style={[styles.profitTabText, profitTab === 'buy' && styles.profitTabTextActive]}>
                  Buy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.profitTab, profitTab === 'sell' && styles.profitTabActive]}
                onPress={() => setProfitTab('sell')}>
                <Text style={[styles.profitTabText, profitTab === 'sell' && styles.profitTabTextActive]}>
                  Sell
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.profitTab, profitTab === 'interest' && styles.profitTabActive]}
                onPress={() => setProfitTab('interest')}>
                <Text style={[styles.profitTabText, profitTab === 'interest' && styles.profitTabTextActive]}>
                  Interest
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            <ScrollView style={styles.profitContentContainer} showsVerticalScrollIndicator={false}>
              {profitTab === 'buy' && (
                <View>
                  <View style={styles.profitSummaryCard}>
                    <Text style={styles.profitSummaryLabel}>Total Commission (Buy)</Text>
                    <Text style={styles.profitSummaryValue}>
                      {formatCurrency(summary?.totalBuyCommission || 0)}
                    </Text>
                  </View>
                  <Text style={styles.profitSectionTitle}>Commission Transactions</Text>
                  {summary?.recentTransactions
                    .filter(t => t.transactionType === 'BUY' && (t as any).commissionAmount > 0)
                    .map((transaction, index) => (
                      <View key={index} style={styles.profitTransactionCard}>
                        <View style={styles.profitTransactionLeft}>
                          <Text style={styles.profitTransactionTitle}>{(transaction as any).supplierName}</Text>
                          <Text style={styles.profitTransactionSubtitle}>
                            {(transaction as any).grainType} • {formatDate(transaction.date)}
                          </Text>
                        </View>
                        <Text style={styles.profitTransactionAmount}>
                          {formatCurrency((transaction as any).commissionAmount || 0)}
                        </Text>
                      </View>
                    ))}
                </View>
              )}

              {profitTab === 'sell' && (
                <View>
                  <View style={styles.profitSummaryCard}>
                    <Text style={styles.profitSummaryLabel}>Total Commission (Sell)</Text>
                    <Text style={styles.profitSummaryValue}>
                      {formatCurrency(summary?.totalSellCommission || 0)}
                    </Text>
                  </View>
                  <View style={styles.profitSummaryCard}>
                    <Text style={styles.profitSummaryLabel}>Total Labour Charges (Sell)</Text>
                    <Text style={styles.profitSummaryValue}>
                      {formatCurrency(summary?.totalSellLabourCharges || 0)}
                    </Text>
                  </View>
                  <View style={styles.profitSummaryCard}>
                    <Text style={styles.profitSummaryLabel}>Total (Commission + Labour)</Text>
                    <Text style={[styles.profitSummaryValue, {color: Colors.success, fontSize: 20}]}>
                      {formatCurrency((summary?.totalSellCommission || 0) + (summary?.totalSellLabourCharges || 0))}
                    </Text>
                  </View>
                  <Text style={styles.profitSectionTitle}>Sell Transactions</Text>
                  {summary?.recentTransactions
                    .filter(t => t.transactionType === 'SELL' && ((t as any).commissionAmount > 0 || (t as any).labourCharges > 0))
                    .map((transaction, index) => (
                      <View key={index} style={styles.profitTransactionCard}>
                        <View style={styles.profitTransactionLeft}>
                          <Text style={styles.profitTransactionTitle}>{(transaction as any).buyerName}</Text>
                          <Text style={styles.profitTransactionSubtitle}>
                            {(transaction as any).grainType} • {formatDate(transaction.date)}
                          </Text>
                          <Text style={styles.profitTransactionDetails}>
                            Commission: {formatCurrency((transaction as any).commissionAmount || 0)} | 
                            Labour: {formatCurrency((transaction as any).labourCharges || 0)}
                          </Text>
                        </View>
                        <Text style={styles.profitTransactionAmount}>
                          {formatCurrency(((transaction as any).commissionAmount || 0) + ((transaction as any).labourCharges || 0))}
                        </Text>
                      </View>
                    ))}
                </View>
              )}

              {profitTab === 'interest' && (
                <View>
                  <View style={styles.profitSummaryCard}>
                    <Text style={styles.profitSummaryLabel}>Interest Feature</Text>
                    <Text style={styles.profitSummaryValue}>Coming Soon</Text>
                  </View>
                  <Text style={styles.profitEmptyText}>
                    Interest tracking for lend transactions will be available in a future update.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.stockCloseButton}
              onPress={() => setIsProfitModalVisible(false)}>
              <Text style={styles.stockCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={isDatePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDatePickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModalContent}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setIsDatePickerVisible(false)}>
                <Icon name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Calendar
              maxDate={new Date().toISOString().split('T')[0]}
              onDayPress={(day: {dateString: string}) => {
                const selected = new Date(day.dateString);
                selected.setHours(0, 0, 0, 0);
                setSelectedDate(selected);
                setIsDatePickerVisible(false);
                
                // Load summary with the selected date immediately
                setTimeout(async () => {
                  try {
                    const endOfDay = new Date(selected);
                    endOfDay.setHours(23, 59, 59, 999);
                    const data = await TransactionService.getDashboardSummaryByDateRange(
                      selected,
                      endOfDay,
                    );
                    setSummary(data);
                  } catch (error) {
                    console.error('Error loading summary for selected date:', error);
                  }
                }, 100);
              }}
              markedDates={
                selectedDate
                  ? {
                      [selectedDate.toISOString().split('T')[0]]: {
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
            
            <View style={styles.calendarFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsDatePickerVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Labour Charges Modal */}
      <Modal
        visible={isLabourModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsLabourModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.labourModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Labour Charges Transactions</Text>
              <TouchableOpacity onPress={() => setIsLabourModalVisible(false)}>
                <Icon name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loadingLabour ? (
              <View style={styles.modalLoadingContainer}>
                <Text style={styles.modalLoadingText}>Loading...</Text>
              </View>
            ) : labourTransactions.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Icon name="information-outline" size={48} color={Colors.textSecondary} />
                <Text style={styles.modalEmptyText}>No labour charges transactions found</Text>
              </View>
            ) : (
              <>
                {/* Settle All Button */}
                {labourTransactions.some((t: any) => !t.labourChargesSettled) && (
                  <View style={styles.settleAllContainer}>
                    <View style={styles.settleAllInfo}>
                      <Text style={styles.settleAllLabel}>Total Unsettled:</Text>
                      <Text style={styles.settleAllAmount}>
                        {formatCurrency(
                          labourTransactions
                            .filter((t: any) => !t.labourChargesSettled)
                            .reduce((sum: number, t: any) => sum + (t.labourCharges || 0), 0)
                        )}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.settleAllButton}
                      onPress={async () => {
                        const unsettledTransactions = labourTransactions.filter((t: any) => !t.labourChargesSettled);
                        const totalAmount = unsettledTransactions.reduce(
                          (sum: number, t: any) => sum + (t.labourCharges || 0),
                          0
                        );

                        Alert.alert(
                          'Settle All Labour Charges',
                          `Settle ${formatCurrency(totalAmount)} for ${unsettledTransactions.length} transaction(s)?\n\nThis will deduct the total amount from your current cash balance.`,
                          [
                            {text: 'Cancel', style: 'cancel'},
                            {
                              text: 'Settle All',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  const currentBalance = await CashBalanceService.getCurrentBalance();
                                  const newBalance = currentBalance - totalAmount;

                                  // Update cash balance
                                  await CashBalanceService.setBalance(newBalance);

                                  // Mark all unsettled transactions as settled
                                  for (const transaction of unsettledTransactions) {
                                    await TransactionService.updateBuyTransaction(transaction.id, {
                                      ...transaction,
                                      labourChargesSettled: true,
                                    });
                                  }

                                  setCurrentCashBalance(newBalance);

                                  // Update local state
                                  const updatedTransactions = labourTransactions.map((t: any) => ({
                                    ...t,
                                    labourChargesSettled: true,
                                  }));
                                  setLabourTransactions(updatedTransactions);

                                  await loadDashboardData();

                                  Alert.alert('Success', `All ${unsettledTransactions.length} labour charges settled successfully`);
                                } catch (error) {
                                  console.error('Error settling all labour charges:', error);
                                  Alert.alert('Error', 'Failed to settle labour charges');
                                }
                              },
                            },
                          ],
                        );
                      }}>
                      <Icon name="cash-multiple" size={18} color={Colors.textLight} />
                      <Text style={styles.settleAllButtonText}>Settle All</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <ScrollView style={styles.labourList} showsVerticalScrollIndicator={false}>
                {labourTransactions.map((transaction: any) => (
                  <View key={transaction.id} style={styles.labourItem}>
                    <View style={styles.labourItemHeader}>
                      <View style={styles.labourItemLeft}>
                        <Text style={styles.labourSupplierName}>{transaction.supplierName}</Text>
                        <Text style={styles.labourDate}>{formatDate(transaction.date)}</Text>
                        <Text style={styles.labourGrain}>{transaction.grainType} - {transaction.quantity} Qtl</Text>
                      </View>
                      <View style={styles.labourItemRight}>
                        <Text style={styles.labourAmount}>{formatCurrency(transaction.labourCharges || 0)}</Text>
                        {transaction.labourChargesSettled && (
                          <View style={styles.settledBadge}>
                            <Icon name="check-circle" size={16} color={Colors.success} />
                            <Text style={styles.settledText}>Settled</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
              </>
            )}
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
  clearButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  clearButtonText: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: 'bold',
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
  
  // Custom Date Section
  customDateSection: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadow.small,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
    marginBottom: Spacing.xs,
  },
  datePickerButtonText: {
    ...Typography.body2,
    flex: 1,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  datePickerHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  
  // Two Column Layout
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  stackCard: {
    flex: 1,
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
  expenseCard: {
    backgroundColor: '#FAE8FF',
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
  tapHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontSize: 10,
    fontStyle: 'italic',
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
  
  // Stock Modal Styles
  stockModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    ...Shadow.large,
  },
  stockTotalText: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  stockListContainer: {
    maxHeight: 400,
    marginBottom: Spacing.lg,
  },
  stockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  stockItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stockGrainIcon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  stockGrainName: {
    ...Typography.body1,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  stockItemRight: {
    alignItems: 'flex-end',
  },
  stockQuantity: {
    ...Typography.body1,
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.success,
  },
  stockNegative: {
    color: Colors.error,
  },
  emptyStockText: {
    ...Typography.body1,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: Spacing.xl,
  },
  stockCloseButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  stockCloseButtonText: {
    ...Typography.button,
    color: Colors.textLight,
  },
  
  // Profit Modal Styles
  profitModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 550,
    maxHeight: '85%',
    ...Shadow.large,
  },
  profitTotalText: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  profitTabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  profitTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  profitTabActive: {
    backgroundColor: Colors.primary,
  },
  profitTabText: {
    ...Typography.body2,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  profitTabTextActive: {
    color: Colors.textLight,
  },
  profitContentContainer: {
    maxHeight: 450,
    marginBottom: Spacing.lg,
  },
  profitSummaryCard: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  profitSummaryLabel: {
    ...Typography.body2,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  profitSummaryValue: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.success,
  },
  profitSectionTitle: {
    ...Typography.body1,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  profitTransactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  profitTransactionLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  profitTransactionTitle: {
    ...Typography.body1,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  profitTransactionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  profitTransactionDetails: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  profitTransactionAmount: {
    ...Typography.body1,
    fontWeight: 'bold',
    color: Colors.success,
  },
  profitEmptyText: {
    ...Typography.body2,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
    fontStyle: 'italic',
  },
  
  // Date Picker Modal Styles
  datePickerModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '95%',
    maxWidth: 450,
    maxHeight: '90%',
    ...Shadow.large,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  calendarFooter: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    ...Typography.button,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  
  // Labour Charges Modal Styles
  labourModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '95%',
    maxWidth: 500,
    maxHeight: '85%',
    ...Shadow.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalLoadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingText: {
    ...Typography.body1,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  modalEmptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmptyText: {
    ...Typography.body1,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  labourList: {
    maxHeight: 500,
  },
  labourItem: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  labourItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  labourItemLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  labourSupplierName: {
    ...Typography.body1,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  labourDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  labourGrain: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  labourItemRight: {
    alignItems: 'flex-end',
  },
  labourAmount: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.purple,
    marginBottom: Spacing.xs,
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  settledText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '600',
  },
  settleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    ...Shadow.small,
  },
  settleButtonText: {
    ...Typography.caption,
    color: Colors.textLight,
    fontWeight: '600',
  },
  settleAllContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.purple,
  },
  settleAllInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  settleAllLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  settleAllAmount: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.purple,
  },
  settleAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadow.medium,
  },
  settleAllButtonText: {
    ...Typography.button,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
});

import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, RefreshControl} from 'react-native';
import {SummaryCard} from '../components/SummaryCard';
import {TransactionCard} from '../components/TransactionCard';
import {FloatingActionButton} from '../components/FloatingActionButton';
import {Colors, Typography, Spacing} from '../constants/theme';
import TransactionService from '../services/TransactionService';
import {DashboardSummary} from '../models/Transaction';

/**
 * Dashboard Screen
 * Displays summary of all transactions and recent activity
 */
export const DashboardScreen: React.FC<any> = ({navigation}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      const data = await TransactionService.getDashboardSummary();
      setSummary(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

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
      onPress: () => navigation.navigate('AddBuyTransaction'),
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

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={styles.header}>Dashboard</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <SummaryCard
            title="Total Buy Amount"
            amount={summary?.totalBuyAmount || 0}
            color={Colors.buy}
          />
          <SummaryCard
            title="Total Sell Amount"
            amount={summary?.totalSellAmount || 0}
            color={Colors.sell}
          />
          <SummaryCard
            title="Total Lend Amount"
            amount={summary?.totalLendAmount || 0}
            color={Colors.lend}
          />
          <SummaryCard
            title="Total Expense"
            amount={summary?.totalExpenseAmount || 0}
            color={Colors.expense}
          />
          <SummaryCard
            title="Net Profit"
            amount={summary?.profit || 0}
            color={summary?.profit && summary.profit > 0 ? Colors.success : Colors.error}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Payments</Text>
          <SummaryCard
            title="Pending Buy Payments"
            amount={summary?.totalPendingBuyAmount || 0}
            color={Colors.warning}
          />
          <SummaryCard
            title="Pending Sell Receivables"
            amount={summary?.totalPendingSellAmount || 0}
            color={Colors.warning}
          />
          <SummaryCard
            title="Pending Lend Returns"
            amount={summary?.totalPendingLendAmount || 0}
            color={Colors.warning}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {summary?.recentTransactions.map(transaction => (
            <TransactionCard key={transaction.id} transaction={transaction} onPress={() => {}} />
          ))}
        </View>
      </ScrollView>

      <FloatingActionButton items={fabItems} />
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
  },
  header: {
    ...Typography.h2,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  loadingText: {
    ...Typography.body1,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});

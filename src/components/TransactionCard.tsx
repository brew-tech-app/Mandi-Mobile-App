import React from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';
import {Transaction, TransactionType} from '../models/Transaction';
import {formatDate, formatCurrency} from '../utils/helpers';
import {moderateScale} from '../utils/responsive';

interface TransactionCardProps {
  transaction: Transaction;
  onPress: () => void;
}

/**
 * Transaction Card Component
 * Displays a summary of a transaction in a card format
 * Following Single Responsibility Principle
 */
export const TransactionCard: React.FC<TransactionCardProps> = ({transaction, onPress}) => {
  const getCardColor = () => {
    switch (transaction.transactionType) {
      case TransactionType.BUY:
        return Colors.buy;
      case TransactionType.SELL:
        return Colors.sell;
      case TransactionType.LEND:
        return Colors.lend;
      case TransactionType.EXPENSE:
        return Colors.expense;
      default:
        return Colors.primary;
    }
  };

  const getTitle = () => {
    switch (transaction.transactionType) {
      case TransactionType.BUY:
        return (transaction as any).supplierName;
      case TransactionType.SELL:
        return (transaction as any).buyerName;
      case TransactionType.LEND:
        return (transaction as any).personName;
      case TransactionType.EXPENSE:
        return (transaction as any).expenseName;
      default:
        return 'Unknown';
    }
  };

  const getAmount = () => {
    switch (transaction.transactionType) {
      case TransactionType.BUY:
      case TransactionType.SELL:
      case TransactionType.EXPENSE:
        return (transaction as any).totalAmount || (transaction as any).amount;
      case TransactionType.LEND:
        return (transaction as any).amount || 0;
      default:
        return 0;
    }
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.typeIndicator, {backgroundColor: getCardColor()}]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={[styles.type, {color: getCardColor()}]}>
            {transaction.transactionType}
          </Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.date}>{formatDate(transaction.date)}</Text>
          <Text style={styles.amount}>{formatCurrency(getAmount())}</Text>
        </View>
        {transaction.description && (
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Shadow.small,
    minHeight: moderateScale(90, 0.3),
  },
  typeIndicator: {
    width: moderateScale(4, 0.2),
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.h4,
    flex: 1,
    marginRight: Spacing.sm,
  },
  type: {
    ...Typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  date: {
    ...Typography.body2,
  },
  amount: {
    ...Typography.h4,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  description: {
    ...Typography.body2,
    fontStyle: 'italic',
  },
});

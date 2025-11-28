import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';
import {formatCurrency} from '../utils/helpers';
import {moderateScale} from '../utils/responsive';

interface SummaryCardProps {
  title: string;
  amount: number;
  color: string;
  icon?: string;
}

/**
 * Summary Card Component
 * Displays financial summary information
 */
export const SummaryCard: React.FC<SummaryCardProps> = ({title, amount, color}) => {
  return (
    <View style={[styles.card, {borderLeftColor: color}]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.amount, {color}]}>{formatCurrency(amount)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: moderateScale(4, 0.2),
    ...Shadow.small,
    minHeight: moderateScale(80, 0.3),
  },
  title: {
    ...Typography.body2,
    marginBottom: Spacing.xs,
  },
  amount: {
    ...Typography.h3,
    fontWeight: 'bold',
  },
});

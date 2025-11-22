import React, {useState, useEffect} from 'react';
import {View, StyleSheet, FlatList, Text} from 'react-native';
import {TransactionCard} from '../components/TransactionCard';
import {CustomButton} from '../components/CustomButton';
import {Colors, Typography, Spacing} from '../constants/theme';
import TransactionService from '../services/TransactionService';
import {BuyTransaction} from '../models/Transaction';

/**
 * Buy Transactions List Screen
 */
export const BuyTransactionsScreen: React.FC<any> = ({navigation}) => {
  const [transactions, setTransactions] = useState<BuyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async () => {
    try {
      const data = await TransactionService.getAllBuyTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error loading buy transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTransactions();
    });
    return unsubscribe;
  }, [navigation]);

  const handleAddTransaction = () => {
    navigation.navigate('AddBuyTransaction');
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <TransactionCard
            transaction={item}
            onPress={() => navigation.navigate('BuyTransactionDetail', {id: item.id})}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No buy transactions yet</Text>
        }
      />
      <View style={styles.buttonContainer}>
        <CustomButton title="Add Buy Transaction" onPress={handleAddTransaction} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: Spacing.md,
  },
  emptyText: {
    ...Typography.body1,
    textAlign: 'center',
    marginTop: Spacing.xl,
    color: Colors.textSecondary,
  },
  buttonContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
  },
});

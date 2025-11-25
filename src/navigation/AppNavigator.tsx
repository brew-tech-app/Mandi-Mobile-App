import React, {useState, useEffect} from 'react';
import {ActivityIndicator, View, StyleSheet, Text} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {DashboardScreen} from '../screens/DashboardScreen';
import {BuyTransactionsScreen} from '../screens/BuyTransactionsScreen';
import {AddBuyTransactionScreen} from '../screens/AddBuyTransactionScreen';
import {AddSellTransactionScreen} from '../screens/AddSellTransactionScreen';
import {AddLendTransactionScreen} from '../screens/AddLendTransactionScreen';
import {BuyTransactionsListScreen} from '../screens/BuyTransactionsListScreen';
import {SellTransactionsListScreen} from '../screens/SellTransactionsListScreen';
import {LendTransactionsListScreen} from '../screens/LendTransactionsListScreen';
import {LendTransactionReceiptScreen} from '../screens/LendTransactionReceiptScreen';
import {BuyTransactionReceiptScreen} from '../screens/BuyTransactionReceiptScreen';
import {SellTransactionReceiptScreen} from '../screens/SellTransactionReceiptScreen';
import {EditBuyTransactionScreen} from '../screens/EditBuyTransactionScreen';
import {EditSellTransactionScreen} from '../screens/EditSellTransactionScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {SignUpScreen} from '../screens/SignUpScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {Colors} from '../constants/theme';
import AuthService from '../services/AuthService';
import auth from '@react-native-firebase/auth';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const BuyStack = createStackNavigator();
const SellStack = createStackNavigator();
const LendStack = createStackNavigator();

/**
 * Buy Stack Navigator
 */
const BuyStackNavigator = () => {
  return (
    <BuyStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.textLight,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <BuyStack.Screen
        name="BuyTransactionsList"
        component={BuyTransactionsListScreen}
        options={{title: 'Buy Transactions'}}
      />
      <BuyStack.Screen
        name="AddBuyTransaction"
        component={AddBuyTransactionScreen}
        options={{title: 'Add Buy Transaction'}}
      />
      <BuyStack.Screen
        name="BuyTransactionReceipt"
        component={BuyTransactionReceiptScreen}
        options={{title: 'Transaction Receipt'}}
      />
      <BuyStack.Screen
        name="EditBuyTransaction"
        component={EditBuyTransactionScreen}
        options={{title: 'Edit Transaction'}}
      />
    </BuyStack.Navigator>
  );
};

/**
 * Sell Stack Navigator
 */
const SellStackNavigator = () => {
  return (
    <SellStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.textLight,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <SellStack.Screen
        name="SellTransactionsList"
        component={SellTransactionsListScreen}
        options={{title: 'Sell Transactions'}}
      />
      <SellStack.Screen
        name="AddSellTransaction"
        component={AddSellTransactionScreen}
        options={{title: 'Add Sell Transaction'}}
      />
      <SellStack.Screen
        name="SellTransactionReceipt"
        component={SellTransactionReceiptScreen}
        options={{title: 'Transaction Receipt'}}
      />
      <SellStack.Screen
        name="EditSellTransaction"
        component={EditSellTransactionScreen}
        options={{title: 'Edit Transaction'}}
      />
    </SellStack.Navigator>
  );
};

/**
 * Lend Stack Navigator
 */
const LendStackNavigator = () => {
  return (
    <LendStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.textLight,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <LendStack.Screen
        name="LendTransactionsList"
        component={LendTransactionsListScreen}
        options={{title: 'Lend Transactions'}}
      />
      <LendStack.Screen
        name="AddLendTransaction"
        component={AddLendTransactionScreen}
        options={{title: 'Add Lend Transaction'}}
      />
      <LendStack.Screen
        name="LendTransactionReceipt"
        component={LendTransactionReceiptScreen}
        options={{title: 'Loan Details'}}
      />
    </LendStack.Navigator>
  );
};

/**
 * Bottom Tab Navigator
 */
const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({color}) => <View><Text style={{fontSize: 24}}>📊</Text></View>,
        }}
      />
      <Tab.Screen
        name="BuyTransactions"
        component={BuyStackNavigator}
        options={{
          tabBarLabel: 'Buy',
          tabBarIcon: ({color}) => <View><Text style={{fontSize: 24}}>🛒</Text></View>,
        }}
      />
      <Tab.Screen
        name="SellTransactions"
        component={SellStackNavigator}
        options={{
          tabBarLabel: 'Sell',
          tabBarIcon: ({color}) => <View><Text style={{fontSize: 24}}>💰</Text></View>,
        }}
      />
      <Tab.Screen
        name="LendTransactions"
        component={LendStackNavigator}
        options={{
          tabBarLabel: 'Lend',
          tabBarIcon: ({color}) => <View><Text style={{fontSize: 24}}>🤝</Text></View>,
        }}
      />
      <Tab.Screen
        name="ExpenseTransactions"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Expense',
          tabBarIcon: ({color}) => <View><Text style={{fontSize: 24}}>💸</Text></View>,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({color}) => <View><Text style={{fontSize: 24}}>⚙️</Text></View>,
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Main App Navigator
 * Handles authentication state and navigation
 */
export const AppNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribe = auth().onAuthStateChanged(user => {
      setIsAuthenticated(!!user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: Colors.textLight,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}>
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{headerShown: false}}
            />
          </>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen
              name="Main"
              component={BottomTabNavigator}
              options={{headerShown: false}}
            />
            {/* Modal Screens for FAB */}
            <Stack.Screen
              name="AddBuyTransactionModal"
              component={AddBuyTransactionScreen}
              options={{
                presentation: 'modal',
                title: 'Add Buy Transaction',
                headerStyle: {
                  backgroundColor: Colors.primary,
                },
                headerTintColor: Colors.textLight,
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen
              name="AddSellTransactionModal"
              component={AddSellTransactionScreen}
              options={{
                presentation: 'modal',
                title: 'Add Sell Transaction',
                headerStyle: {
                  backgroundColor: Colors.primary,
                },
                headerTintColor: Colors.textLight,
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen
              name="AddLendTransactionModal"
              component={AddLendTransactionScreen}
              options={{
                presentation: 'modal',
                title: 'Add Lend Transaction',
                headerStyle: {
                  backgroundColor: Colors.primary,
                },
                headerTintColor: Colors.textLight,
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});

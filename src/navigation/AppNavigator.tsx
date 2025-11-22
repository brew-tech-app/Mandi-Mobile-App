import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {DashboardScreen} from '../screens/DashboardScreen';
import {BuyTransactionsScreen} from '../screens/BuyTransactionsScreen';
import {Colors} from '../constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="BuyTransactions"
        component={BuyTransactionsScreen}
        options={{
          tabBarLabel: 'Buy',
        }}
      />
      <Tab.Screen
        name="SellTransactions"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Sell',
        }}
      />
      <Tab.Screen
        name="LendTransactions"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Lend',
        }}
      />
      <Tab.Screen
        name="ExpenseTransactions"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Expense',
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Main App Navigator
 */
export const AppNavigator = () => {
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
        <Stack.Screen
          name="Main"
          component={BottomTabNavigator}
          options={{headerShown: false}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

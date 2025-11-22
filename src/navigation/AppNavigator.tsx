import React, {useState, useEffect} from 'react';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {DashboardScreen} from '../screens/DashboardScreen';
import {BuyTransactionsScreen} from '../screens/BuyTransactionsScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {SignUpScreen} from '../screens/SignUpScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {Colors} from '../constants/theme';
import AuthService from '../services/AuthService';

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
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
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
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      setIsAuthenticated(!!user);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

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
          <Stack.Screen
            name="Main"
            component={BottomTabNavigator}
            options={{headerShown: false}}
          />
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

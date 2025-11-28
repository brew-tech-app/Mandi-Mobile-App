import React, {useState} from 'react';
import {View, Text, StyleSheet, Pressable, Animated, Modal} from 'react-native';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';
import {moderateScale, getResponsiveValue} from '../utils/responsive';

interface FABMenuItem {
  label: string;
  color: string;
  onPress: () => void;
}

interface FloatingActionButtonProps {
  items: FABMenuItem[];
}

/**
 * Floating Action Button with expandable menu
 * Displays transaction type options (Buy, Sell, Lend, Expense)
 */
export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({items}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;

    Animated.spring(animation, {
      toValue,
      friction: 5,
      useNativeDriver: true,
    }).start();

    setIsOpen(!isOpen);
  };

  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const handleItemPress = (onPress: () => void) => {
    toggleMenu();
    onPress();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <Pressable style={styles.backdrop} onPress={toggleMenu} />
      )}

      <View style={styles.container} pointerEvents="box-none">
        {/* Menu Items */}
        {isOpen &&
          items.map((item, index) => {
            const itemAnimation = animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -(60 * (items.length - index))],
            });

            return (
              <Animated.View
                key={item.label}
                style={[
                  styles.menuItem,
                  {
                    transform: [{translateY: itemAnimation}],
                    opacity: animation,
                  },
                ]}
                pointerEvents="box-none">
                <Pressable
                  style={styles.menuItemButton}
                  onPress={() => handleItemPress(item.onPress)}>
                  <View style={[styles.menuItemCircle, {backgroundColor: item.color}]}>
                    <Text style={styles.menuItemIcon}>+</Text>
                  </View>
                  <View style={styles.labelContainer}>
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}

        {/* Main FAB Button */}
        <Pressable style={styles.fab} onPress={toggleMenu}>
          <Animated.Text style={[styles.fabIcon, {transform: [{rotate: rotation}]}]}>
            +
          </Animated.Text>
        </Pressable>
      </View>
    </>
  );
};

const FAB_SIZE = getResponsiveValue(50, 56, 60);
const MENU_ITEM_SIZE = getResponsiveValue(42, 48, 52);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: moderateScale(80, 0.3),
    right: Spacing.md,
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.large,
  },
  fabIcon: {
    fontSize: moderateScale(32, 0.3),
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  menuItem: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1001,
  },
  menuItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  labelContainer: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    ...Shadow.small,
  },
  menuItemLabel: {
    ...Typography.body1,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  menuItemCircle: {
    width: MENU_ITEM_SIZE,
    height: MENU_ITEM_SIZE,
    borderRadius: MENU_ITEM_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.medium,
  },
  menuItemIcon: {
    fontSize: moderateScale(24, 0.3),
    color: Colors.textLight,
    fontWeight: 'bold',
  },
});

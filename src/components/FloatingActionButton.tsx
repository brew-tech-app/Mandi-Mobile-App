import React, {useState} from 'react';
import {View, Text, StyleSheet, Pressable, Animated, Modal} from 'react-native';
import {Colors, Typography, Spacing, BorderRadius, Shadow} from '../constants/theme';

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
        <Modal transparent visible={isOpen} animationType="fade" onRequestClose={toggleMenu}>
          <Pressable style={styles.backdrop} onPress={toggleMenu} />
        </Modal>
      )}

      <View style={styles.container}>
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
                ]}>
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

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    right: Spacing.md,
    alignItems: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.large,
  },
  fabIcon: {
    fontSize: 32,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.medium,
  },
  menuItemIcon: {
    fontSize: 24,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
});

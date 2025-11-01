import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import notificationService from '../services/notificationService';

interface NotificationButtonProps {
  onPress: () => void;
}

const NotificationButton: React.FC<NotificationButtonProps> = ({ onPress }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Subscribe to notification updates
    const unsubscribe = notificationService.subscribe(() => {
      const count = notificationService.getNotifications().length;
      setUnreadCount(count);
    });

    // Get initial count
    setUnreadCount(notificationService.getNotifications().length);

    return unsubscribe;
  }, []);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon name="notifications" size={24} color="#ffffff" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default NotificationButton;


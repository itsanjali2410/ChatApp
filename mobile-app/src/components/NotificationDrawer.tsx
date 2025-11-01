import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import notificationService, { NotificationData } from '../services/notificationService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.7;

interface NotificationDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  visible,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [slideAnim] = useState(new Animated.Value(DRAWER_HEIGHT));

  useEffect(() => {
    // Subscribe to notification updates
    const unsubscribe = notificationService.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications);
    });

    // Load initial notifications
    setNotifications(notificationService.getNotifications());

    // Animate drawer
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: DRAWER_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }

    return unsubscribe;
  }, [visible]);

  const handleClearAll = () => {
    notificationService.clearNotifications();
  };

  const handleRemoveNotification = (id: string) => {
    notificationService.removeNotification(id);
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return 'message';
      case 'file':
        return 'attach-file';
      case 'system':
        return 'notifications';
      default:
        return 'notifications';
    }
  };

  const renderNotificationItem = ({ item }: { item: NotificationData }) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationContent}>
        <View style={styles.iconContainer}>
          <Icon
            name={getNotificationIcon(item.type)}
            size={24}
            color="#3b82f6"
          />
        </View>
        <View style={styles.notificationText}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleRemoveNotification(item.id)}
        >
          <Icon name="close" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.drawerHeader}>
            <View style={styles.drawerHeaderContent}>
              <Text style={styles.drawerTitle}>Notifications</Text>
              <Text style={styles.notificationCount}>
                {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
              </Text>
            </View>
            <View style={styles.drawerActions}>
              {notifications.length > 0 && (
                <>
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClearAll}
                  >
                    <Text style={styles.clearButtonText}>Clear All</Text>
                  </TouchableOpacity>
                  <View style={{ width: 12 }} />
                </>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Icon name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              notifications.length === 0 ? styles.emptyContainer : undefined
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="notifications-none" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No notifications</Text>
                <Text style={styles.emptySubtext}>
                  Your notifications will appear here
                </Text>
              </View>
            }
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: DRAWER_HEIGHT,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  drawerHeaderContent: {
    flex: 1,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  notificationCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  drawerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});

export default NotificationDrawer;


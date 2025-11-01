import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getFileUrl } from '../services/api';

const { width } = Dimensions.get('window');

type Chat = {
  id: string;
  type: string;
  participants: string[];
  organization_id: string;
  group_name?: string;
  group_description?: string;
  group_avatar?: string;
  created_by?: string;
  admins?: string[];
};

type User = {
  _id: string;
  username?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  is_online?: boolean;
};

type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  message_type: string;
  timestamp: string;
};

const ChatScreen = () => {
  const navigation = useNavigation();
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastMessages, setLastMessages] = useState<{ [chatId: string]: string }>({});
  const [lastTimestamps, setLastTimestamps] = useState<{ [chatId: string]: string }>({});
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const autoRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Fetch chats and users
  const fetchData = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) {
        setRefreshing(true);
      }

      // Fetch chats
      const chatsResponse = await api.get('/chats/my-chats');
      const chatsData = chatsResponse.data;
      setChats(chatsData);

      // Fetch users
      const usersResponse = await api.get('/users/by_org');
      const usersData = usersResponse.data;
      setUsers(usersData);

      // Fetch last message for each chat
      const messagesData: { [chatId: string]: string } = {};
      const timestampsData: { [chatId: string]: string } = {};

      for (const chat of chatsData) {
        try {
          const msgsResponse = await api.get(`/messages/chat/${chat.id}`);
          if (msgsResponse.data && msgsResponse.data.length > 0) {
            const lastMsg = msgsResponse.data[msgsResponse.data.length - 1];
            messagesData[chat.id] = lastMsg.message || '📎 File';
            timestampsData[chat.id] = lastMsg.timestamp || new Date().toISOString();
          }
        } catch (e) {
          console.error(`Failed to load messages for chat ${chat.id}:`, e);
        }
      }

      setLastMessages(messagesData);
      setLastTimestamps(timestampsData);
      setLastRefreshTime(new Date());
    } catch (error: any) {
      console.error('Error fetching data:', error);
      const errorMessage = error?.response?.data?.detail || 'Failed to load chats';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsAutoRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Auto-refresh every 10 seconds
  useEffect(() => {
    // Clear any existing interval
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }

    // Set up auto-refresh
    autoRefreshIntervalRef.current = setInterval(() => {
      setIsAutoRefreshing(true);
      
      // Animate the sync icon
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
      
      fetchData(false); // Silent refresh (no loader)
      
      // Reset auto-refreshing indicator after a short delay
      setTimeout(() => {
        setIsAutoRefreshing(false);
        rotateAnim.setValue(0);
      }, 1000);
    }, 10000); // 10 seconds

    // Cleanup on unmount
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [fetchData]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Get chat name and avatar
  const getChatDisplay = (chat: Chat) => {
    if (chat.type === 'group') {
      return {
        name: chat.group_name || 'Group Chat',
        avatar: chat.group_avatar,
        isGroup: true,
      };
    } else {
      // Direct message - find the other participant
      const otherParticipantId = chat.participants.find(
        (p: string) => p !== users.find((u: User) => u.email === chat.participants[0])?._id
      );
      const otherUser = users.find((u: User) => u._id === otherParticipantId);
      
      if (otherUser) {
        return {
          name: otherUser.first_name && otherUser.last_name
            ? `${otherUser.first_name} ${otherUser.last_name}`
            : otherUser.username || otherUser.email,
          avatar: otherUser.profile_picture,
          isGroup: false,
        };
      }
      
      return {
        name: 'Unknown User',
        avatar: null,
        isGroup: false,
      };
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
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

  // Filter chats based on search
  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true;
    const display = getChatDisplay(chat);
    return display.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sort chats by last message timestamp
  const sortedChats = [...filteredChats].sort((a, b) => {
    const timestampA = lastTimestamps[a.id] || '';
    const timestampB = lastTimestamps[b.id] || '';
    return new Date(timestampB).getTime() - new Date(timestampA).getTime();
  });

  // Render chat item
  const renderChatItem = ({ item: chat }: { item: Chat }): React.ReactElement => {
    const display = getChatDisplay(chat);
    const lastMessage = lastMessages[chat.id] || 'No messages yet';
    const timestamp = formatTimestamp(lastTimestamps[chat.id] || '');

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => {
          // Navigate to chat detail screen when implemented
          Alert.alert('Chat', `Opening chat: ${display.name}`);
        }}
      >
        <View style={styles.avatarContainer}>
          {display.avatar ? (
            <Image
              source={{ uri: getFileUrl(display.avatar) }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon
                name={display.isGroup ? 'group' : 'person'}
                size={24}
                color="#fff"
              />
            </View>
          )}
        </View>
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {display.name}
            </Text>
            {timestamp && (
              <Text style={styles.timestamp}>{timestamp}</Text>
            )}
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessage}
          </Text>
        </View>
        {display.isGroup && (
          <Icon name="group" size={16} color="#9ca3af" style={styles.groupIcon} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  const formatLastRefresh = () => {
    if (!lastRefreshTime) return '';
    const now = new Date();
    const diffMs = now.getTime() - lastRefreshTime.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    return 'Recently';
  };

  return (
    <View style={styles.container}>
      {/* Header with refresh button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Messages</Text>
          {lastRefreshTime && (
            <View style={styles.refreshIndicator}>
              {isAutoRefreshing && (
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: rotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  }}
                >
                  <Icon name="sync" size={12} color="#ffffff" />
                </Animated.View>
              )}
              {isAutoRefreshing && <View style={{ width: 4 }} />}
              <Text style={styles.refreshTime}>{formatLastRefresh()}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Icon
            name="refresh"
            size={24}
            color="#ffffff"
            style={refreshing || isAutoRefreshing ? styles.refreshingIcon : undefined}
          />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Chat list */}
      <FlatList
        data={sortedChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="chat-bubble-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No chats yet</Text>
            <Text style={styles.emptySubtext}>Start a conversation to see it here</Text>
          </View>
        }
        contentContainerStyle={chats.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderBottomWidth: 1,
    borderBottomColor: '#2563eb',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshTime: {
    fontSize: 11,
    color: '#bfdbfe',
    opacity: 0.8,
  },
  refreshButton: {
    padding: 8,
  },
  refreshingIcon: {
    transform: [{ rotate: '360deg' }],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
  },
  groupIcon: {
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
  emptyList: {
    flexGrow: 1,
  },
});

export default ChatScreen;


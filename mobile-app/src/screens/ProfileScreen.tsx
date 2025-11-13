import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api, { getFileUrl } from '../services/api';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadProfile();
    loadEmail();
  }, []);

  const loadEmail = async () => {
    const storedEmail = await AsyncStorage.getItem('email');
    if (storedEmail) setEmail(storedEmail);
  };

  const loadProfile = async () => {
    try {
      const response = await api.get('/users/profile/me');
      setUser(response.data);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      try {
        const adminResponse = await api.get('/admin/profile');
        setUser(adminResponse.data);
      } catch (adminError) {
        console.error('Error loading admin profile:', adminError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['token', 'role', 'email', 'user_id', 'org_id']);
            // App.tsx will detect the auth change and navigate to Login
            navigation.navigate('Login' as never);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const displayName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || email;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {user?.profile_picture ? (
          <Image
            source={{ uri: getFileUrl(user.profile_picture) }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Icon name="person" size={48} color="#ffffff" />
          </View>
        )}
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <Icon name="edit" size={24} color="#3b82f6" />
          <Text style={styles.menuText}>Edit Profile</Text>
          <Icon name="chevron-right" size={24} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="notifications" size={24} color="#3b82f6" />
          <Text style={styles.menuText}>Notifications</Text>
          <Icon name="chevron-right" size={24} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="help" size={24} color="#3b82f6" />
          <Text style={styles.menuText}>Help & Support</Text>
          <Icon name="chevron-right" size={24} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Icon name="logout" size={24} color="#ef4444" />
          <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: '#111827',
  },
  logoutText: {
    color: '#ef4444',
  },
});

export default ProfileScreen;


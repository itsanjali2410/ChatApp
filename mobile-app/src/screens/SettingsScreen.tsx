import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SettingsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name="notifications" size={24} color="#3b82f6" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive notifications for new messages</Text>
            </View>
          </View>
          <Switch value={true} onValueChange={() => {}} />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name="vibrate" size={24} color="#3b82f6" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Vibration</Text>
              <Text style={styles.settingDescription}>Vibrate on new messages</Text>
            </View>
          </View>
          <Switch value={true} onValueChange={() => {}} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name="lock" size={24} color="#3b82f6" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Blocked Users</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name="visibility" size={24} color="#3b82f6" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Last Seen</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name="info" size={24} color="#3b82f6" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>App Version</Text>
              <Text style={styles.settingDescription}>1.0.0</Text>
            </View>
          </View>
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
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default SettingsScreen;


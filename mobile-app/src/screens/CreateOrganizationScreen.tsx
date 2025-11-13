import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const CreateOrganizationScreen = () => {
  const navigation = useNavigation();
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!orgName.trim()) {
      Alert.alert('Error', 'Please enter an organization name');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/orgs/create', {
        name: orgName,
      });

      await AsyncStorage.setItem('org_id', response.data.organization_id || '');

      Alert.alert('Success', 'Organization created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('MainTabs' as never),
        },
      ]);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.detail || 'Failed to create organization';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Icon name="business" size={64} color="#3b82f6" style={styles.icon} />
          <Text style={styles.title}>Create Organization</Text>
          <Text style={styles.subtitle}>
            Create an organization to start chatting with your team
          </Text>

          <View style={styles.inputContainer}>
            <Icon name="business" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Organization Name"
              value={orgName}
              onChangeText={setOrgName}
              autoCapitalize="words"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Create Organization</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateOrganizationScreen;


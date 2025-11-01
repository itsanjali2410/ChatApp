import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CreateOrganizationScreen from './src/screens/CreateOrganizationScreen';

// Import components
import NotificationDrawer from './src/components/NotificationDrawer';
import NotificationButton from './src/components/NotificationButton';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tab Navigator for authenticated users
const MainTabNavigator = ({ navigation }: any) => {
  const [notificationDrawerVisible, setNotificationDrawerVisible] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string;

            if (route.name === 'Chat') {
              iconName = 'chat';
            } else if (route.name === 'Profile') {
              iconName = 'person';
            } else if (route.name === 'Settings') {
              iconName = 'settings';
            } else {
              iconName = 'help';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingBottom: 8,
            paddingTop: 8,
            height: 60,
          },
          headerStyle: {
            backgroundColor: '#3b82f6',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      >
        <Tab.Screen 
          name="Chat" 
          component={ChatScreen}
          options={{ 
            title: 'Messages',
            headerRight: () => (
              <NotificationButton
                onPress={() => setNotificationDrawerVisible(true)}
              />
            ),
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ 
            title: 'Profile',
            headerRight: () => (
              <NotificationButton
                onPress={() => setNotificationDrawerVisible(true)}
              />
            ),
          }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ 
            title: 'Settings',
            headerRight: () => (
              <NotificationButton
                onPress={() => setNotificationDrawerVisible(true)}
              />
            ),
          }}
        />
      </Tab.Navigator>
      <NotificationDrawer
        visible={notificationDrawerVisible}
        onClose={() => setNotificationDrawerVisible(false)}
      />
    </>
  );
};

// Main App Component
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const role = await AsyncStorage.getItem('role');
      
      if (token && role) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for storage changes to handle logout
  useEffect(() => {
    const checkAuthPeriodically = setInterval(() => {
      checkAuthStatus();
    }, 1000);

    return () => clearInterval(checkAuthPeriodically);
  }, []);

  if (isLoading) {
    // You can add a loading screen here
    return null;
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <>
              <Stack.Screen name="MainTabs" component={MainTabNavigator} />
              <Stack.Screen 
                name="CreateOrganization" 
                component={CreateOrganizationScreen}
                options={{ 
                  headerShown: true,
                  title: 'Create Organization',
                  headerStyle: { backgroundColor: '#3b82f6' },
                  headerTintColor: '#ffffff',
                }}
              />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen 
                name="Signup" 
                component={SignupScreen}
                options={{ 
                  headerShown: true,
                  title: 'Create Account',
                  headerStyle: { backgroundColor: '#3b82f6' },
                  headerTintColor: '#ffffff',
                }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

export default App;



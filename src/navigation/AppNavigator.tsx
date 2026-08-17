import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { ChatScreen } from '../screens/ChatScreen';
import { ModelsScreen } from '../screens/ModelsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors, fontSizes } from '../theme';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.divider,
    text: colors.text,
    primary: colors.primary,
    notification: colors.primary,
  },
};

const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
    <Text style={{ 
      fontSize: focused ? 20 : 18, 
      color: focused ? colors.primary : colors.textSecondary 
    }}>
      {label === 'Chat' ? '💬' : label === 'Models' ? '🧠' : '⚙️'}
    </Text>
  </View>
);

export const AppNavigator: React.FC = () => (
  <NavigationContainer theme={navTheme}>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: fontSizes.xs, fontWeight: '600' },
      }}>
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Chat" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Models"
        component={ModelsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Models" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Settings" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  </NavigationContainer>
);

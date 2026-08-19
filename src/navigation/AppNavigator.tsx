import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { ChatScreen } from '../screens/ChatScreen';
import { AgentsScreen } from '../screens/AgentsScreen';
import { MemoryScreen } from '../screens/MemoryScreen';
import { ModelsScreen } from '../screens/ModelsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors, fontSizes, fonts } from '../theme';

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

const TAB_ICONS: Record<string, string> = {
  Chat:     '✦',
  Agents:   '◇',
  Memory:   '◉',
  Models:   '▢',
  Settings: '⚙',
};

export const AppNavigator: React.FC = () => (
  <NavigationContainer theme={navTheme}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: fonts.sans,
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused }) => (
          <Text style={{
            fontSize: focused ? 18 : 16,
            color: focused ? colors.primary : colors.textMuted,
          }}>
            {TAB_ICONS[route.name]}
          </Text>
        ),
      })}>
      <Tab.Screen name="Chat"     component={ChatScreen} />
      <Tab.Screen name="Agents"   component={AgentsScreen} />
      <Tab.Screen name="Memory"   component={MemoryScreen} />
      <Tab.Screen name="Models"   component={ModelsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  </NavigationContainer>
);

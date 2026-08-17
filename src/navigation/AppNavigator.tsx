import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { ChatScreen } from '../screens/ChatScreen';
import { AgentsScreen } from '../screens/AgentsScreen';
import { MemoryScreen } from '../screens/MemoryScreen';
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

const TABS = [
  { name: 'Chat', icon: '💬', screen: ChatScreen },
  { name: 'Agents', icon: '🔮', screen: AgentsScreen },
  { name: 'Memory', icon: '🧠', screen: MemoryScreen },
  { name: 'Models', icon: '📦', screen: ModelsScreen },
  { name: 'Settings', icon: '⚙️', screen: SettingsScreen },
];

export const AppNavigator: React.FC = () => (
  <NavigationContainer theme={navTheme}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          height: 62,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: fontSizes.xs, fontWeight: '700' },
        tabBarIcon: ({ focused }) => {
          const tab = TABS.find((t) => t.name === route.name);
          return <Text style={{ fontSize: focused ? 20 : 18 }}>{tab?.icon}</Text>;
        },
      })}>
      {TABS.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.screen} />
      ))}
    </Tab.Navigator>
  </NavigationContainer>
);

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
    card: '#050505',
    border: colors.primaryDark,
    text: colors.text,
    primary: colors.primary,
    notification: colors.primary,
  },
};

// Terminal-style ASCII tab icons
const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Chat:     { active: '▸', inactive: '▹' },
  Agents:   { active: '◈', inactive: '◇' },
  Memory:   { active: '◉', inactive: '○' },
  Models:   { active: '◆', inactive: '◇' },
  Settings: { active: '⊞', inactive: '⊟' },
};

export const AppNavigator: React.FC = () => (
  <NavigationContainer theme={navTheme}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#050505',
          borderTopColor: colors.primaryDark,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: fonts.mono,
          fontSize: 10,
          letterSpacing: 0.5,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused }) => {
          const icon = TAB_ICONS[route.name];
          return (
            <Text style={{
              fontFamily: fonts.mono,
              fontSize: focused ? 18 : 15,
              color: focused ? colors.primary : colors.textMuted,
            }}>
              {focused ? icon?.active : icon?.inactive}
            </Text>
          );
        },
      })}>
      <Tab.Screen name="Chat"     component={ChatScreen} />
      <Tab.Screen name="Agents"   component={AgentsScreen} />
      <Tab.Screen name="Memory"   component={MemoryScreen} />
      <Tab.Screen name="Models"   component={ModelsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  </NavigationContainer>
);

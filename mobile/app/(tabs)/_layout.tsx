import React from 'react';
import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Search',   tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🔍</Text> }} />
      <Tabs.Screen name="trips"   options={{ title: 'My Trips', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🧳</Text> }} />
      <Tabs.Screen name="alerts"  options={{ title: 'Alerts',   tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🔔</Text> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile',  tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text> }} />
    </Tabs>
  );
}

import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { haptic } from '../../src/utils/haptics';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={23} color={color} />
  );
}

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic.tap() }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          ...(Platform.OS === 'ios' ? {} : { height: 62, paddingBottom: 8 }),
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Search',   tabBarIcon: tabIcon('search', 'search-outline') }} />
      <Tabs.Screen name="trips"   options={{ title: 'Trips',    tabBarIcon: tabIcon('ticket', 'ticket-outline') }} />
      <Tabs.Screen name="alerts"  options={{ title: 'Alerts',   tabBarIcon: tabIcon('notifications', 'notifications-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Account',  tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}

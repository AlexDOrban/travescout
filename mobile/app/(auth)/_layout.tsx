import React from 'react';
import { Stack } from 'expo-router';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AuthLayout() {
  const { user, loading } = useAuth();
  if (loading) return <View style={{ flex: 1 }}><ActivityIndicator /></View>;
  if (user) return <Redirect href="/(tabs)/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

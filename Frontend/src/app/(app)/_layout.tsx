import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function AppLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="course/[id]" options={{ title: 'Course details' }} />
      <Stack.Screen name="assignment/[id]" options={{ title: 'Assignment' }} />
      <Stack.Screen name="assignment-form" options={{ title: 'Assignment', presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}

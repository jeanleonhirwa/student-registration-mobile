import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconTint ios="house.fill" android="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color }) => <IconTint ios="book.fill" android="menu_book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: 'Classwork',
          tabBarIcon: ({ color }) => <IconTint ios="doc.text.fill" android="assignment" color={color} />,
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => <IconTint ios="checkmark.circle.fill" android="check_circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconTint ios="person.fill" android="person" color={color} />,
        }}
      />
    </Tabs>
  );
}

// The tab bar passes a resolved color string; SymbolView takes it as tintColor.
function IconTint({ ios, android, color }: { ios: string; android: string; color: ColorValue }) {
  return (
    <SymbolView
      tintColor={color}
      size={24}
      name={{ ios: ios as never, android: android as never, web: android as never }}
    />
  );
}

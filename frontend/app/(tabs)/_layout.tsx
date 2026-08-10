import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useSessionRole } from '@/hooks/use-session-role';

// orange-500 / slate-400, the same accent and muted pair the screens use.
const ACTIVE_TINT = '#f97316';
const INACTIVE_TINT = '#94a3b8';

// Routes is the picker's landing screen, and pickers are the default when a
// role cannot be determined. Admins are sent to /dashboard by signin instead;
// this value is static and cannot vary by role.
export const unstable_settings = {
  initialRouteName: 'routes',
};

/** Tabs each role sees. Everything else is hidden with `href: null`. */
const ADMIN_TABS = new Set(['dashboard', 'create-order', 'history', 'settings']);
const PICKER_TABS = new Set(['routes', 'orders', 'inventory', 'settings']);

export default function TabLayout() {
  // Shared with the per-screen guards, so the tab bar and the guards can never
  // disagree about the current role.
  const session = useSessionRole();

  // Waiting rather than guessing: rendering with a default role and correcting
  // a moment later makes the tab bar visibly rebuild on every launch.
  if (session.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#f97316" />
      </View>
    );
  }

  // A missing role, or no session at all, falls back to the picker tabs rather
  // than showing nothing.
  const role = session.status === 'signed-in' ? session.role : null;
  const visible = role === 'admin' ? ADMIN_TABS : PICKER_TABS;
  // `href: null` keeps the route mounted and navigable but off the tab bar,
  // which is why the admin screens carry their own RequireAdmin guard.
  const tabFor = (name: string) => (visible.has(name) ? undefined : null);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_TINT,
        tabBarInactiveTintColor: INACTIVE_TINT,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      {/* Declaration order is tab bar order. Picker tabs are declared before
          admin tabs, and Settings last, so both roles get a sensible order
          from this single list. */}
      <Tabs.Screen
        name="routes"
        options={{
          href: tabFor('routes'),
          title: 'Routes',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker-path" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          href: tabFor('orders'),
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          href: tabFor('inventory'),
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="archive-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          href: tabFor('dashboard'),
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create-order"
        options={{
          href: tabFor('create-order'),
          title: 'Create Order',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-plus-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: tabFor('history'),
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: tabFor('settings'),
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

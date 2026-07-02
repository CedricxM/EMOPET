import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '../../src/components/ui/icon';
import { colors, fontFamily, fontSize } from '../../src/theme';

function tabIcon(name: IconName) {
  return ({ color }: { color: string }) => (
    <View style={styles.iconWrap}>
      <Icon name={name} size={22} color={color} strokeWidth={1.5} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.fgHint,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Accueil', tabBarIcon: tabIcon('home') }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Bleiz', tabBarIcon: tabIcon('chat') }}
      />
      <Tabs.Screen
        name="journal"
        options={{ title: 'Journal', tabBarIcon: tabIcon('journal') }}
      />
      <Tabs.Screen
        name="services"
        options={{ title: 'Local', tabBarIcon: tabIcon('compass') }}
      />
      <Tabs.Screen
        name="me"
        options={{ title: 'Profil', tabBarIcon: tabIcon('profile') }}
      />
      <Tabs.Screen name="feed" options={{ href: null }} />
      <Tabs.Screen name="create" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 74,
    paddingTop: 8,
    paddingBottom: 14,
  },
  tabItem: {
    paddingVertical: 4,
  },
  tabLabel: {
    fontFamily: fontFamily.sansSemi,
    fontSize: fontSize.xxs,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  iconWrap: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// EMOPET · App root
// IA : 5 tabs (Home/Chat/Journal/Services/Profile) + stack on Home tab for Trends.

import React, { useEffect, useState } from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Font from 'expo-font';
import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  SourceSans3_400Regular,
  SourceSans3_500Medium,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from '@expo-google-fonts/source-sans-3';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';

import { T } from './src/tokens';
import { Icon } from './src/ui/Icon';
import { HomeScreen } from './src/screens/HomeScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { TrendsScreen } from './src/screens/TrendsScreen';
import {
  JournalScreen,
  ServicesScreen,
  ProfileScreen,
} from './src/screens/JournalServicesProfileScreens';

// ─── Navigation types ─────────────────────────────────────────────
type HomeStackParamList = {
  HomeMain: undefined;
  Trends: undefined;
};

type RootTabParamList = {
  Home: undefined;
  Chat: undefined;
  Journal: undefined;
  Services: undefined;
  Profile: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

// ─── Home stack (wraps HomeMain + Trends sub-screen) ─────────────
function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: T.colors.bg } }}>
      <HomeStack.Screen name="HomeMain">
        {({ navigation }) => (
          <HomeScreen
            variant="normal"
            onNavigateToChat={() => navigation.getParent()?.navigate('Chat')}
            onNavigateToTrends={() => navigation.navigate('Trends')}
          />
        )}
      </HomeStack.Screen>
      <HomeStack.Screen
        name="Trends"
        options={{ animation: 'slide_from_right', animationDuration: 220 }}
      >
        {({ navigation }) => <TrendsScreen onBack={() => navigation.goBack()} />}
      </HomeStack.Screen>
    </HomeStack.Navigator>
  );
}

// ─── Theme ────────────────────────────────────────────────────────
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: T.colors.bg,
    card: T.colors.surface,
    text: T.colors.fg,
    border: T.colors.border,
    primary: T.colors.accent,
  },
};

// ─── Tab bar icons ────────────────────────────────────────────────
function tabIcon(name: 'home' | 'chat' | 'journal' | 'compass' | 'profile') {
  return ({ color }: { color: string }) => <Icon name={name} size={20} color={color} />;
}

// ─── App ──────────────────────────────────────────────────────────
export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    Font.loadAsync({
      Fraunces: Fraunces_500Medium,
      Fraunces_600: Fraunces_600SemiBold,
      SourceSans3: SourceSans3_400Regular,
      SourceSans3_500: SourceSans3_500Medium,
      SourceSans3_600: SourceSans3_600SemiBold,
      SourceSans3_700: SourceSans3_700Bold,
      JetBrainsMono: JetBrainsMono_400Regular,
      JetBrainsMono_500: JetBrainsMono_500Medium,
    })
      .then(() => setFontsLoaded(true))
      .catch(() => setFontsLoaded(true)); // fallback to system fonts
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: T.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={T.colors.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <NavigationContainer theme={navTheme}>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle: {
                backgroundColor: T.colors.surface,
                borderTopWidth: 1,
                borderTopColor: T.colors.border,
                height: 84,
                paddingTop: 8,
                paddingBottom: 24,
              },
              tabBarLabelStyle: {
                fontFamily: T.fonts.sans,
                fontSize: 10,
                fontWeight: T.type.wSemi,
                letterSpacing: 0.4,
              },
              tabBarActiveTintColor: T.colors.accent,
              tabBarInactiveTintColor: T.colors.fgMuted,
            }}
          >
            <Tab.Screen name="Home" component={HomeStackNav} options={{ title: 'Accueil', tabBarIcon: tabIcon('home') }} />
            <Tab.Screen name="Chat" options={{ title: 'Breiz', tabBarIcon: tabIcon('chat') }}>
              {() => <ChatScreen variant="normal" />}
            </Tab.Screen>
            <Tab.Screen name="Journal" options={{ title: 'Journal', tabBarIcon: tabIcon('journal') }}>
              {() => <JournalScreen variant="normal" />}
            </Tab.Screen>
            <Tab.Screen name="Services" options={{ title: 'Local', tabBarIcon: tabIcon('compass') }}>
              {() => <ServicesScreen variant="normal" />}
            </Tab.Screen>
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Moi', tabBarIcon: tabIcon('profile') }} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

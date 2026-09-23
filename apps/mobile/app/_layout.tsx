import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '../src/theme';

/**
 * Alias -> asset map for the branded families.
 *
 * The keys are the family names `src/theme/typography.ts` declares, so the two
 * files must change together. Fraunces is registered at 600 because every
 * serif consumer in `src/components/ui/text.tsx` already declares weight 600.
 */
const brandFonts = {
  Fraunces: Fraunces_600SemiBold,
  'InstrumentSans-Regular': InstrumentSans_400Regular,
  'InstrumentSans-Medium': InstrumentSans_500Medium,
  'InstrumentSans-SemiBold': InstrumentSans_600SemiBold,
  'InstrumentSans-Bold': InstrumentSans_700Bold,
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(brandFonts);

  // Controlled fallback: hold branded UI back only while loading is still in
  // progress, so type does not visibly reflow from a system font to Fraunces /
  // Instrument Sans. If loading fails, render anyway on the system fallback —
  // a font asset must never be able to make the app unreachable.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="progress" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="add-dog" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="support" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

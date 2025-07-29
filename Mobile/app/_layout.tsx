// layout.tsx

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-get-random-values';
import 'react-native-reanimated';
import { ToastProvider } from 'react-native-toast-notifications'


import { useColorScheme } from '@/hooks/useColorScheme';
import { ConnectionProvider } from '../app/(tabs)/scan';

export default function RootLayout() {
  const colorScheme = useColorScheme();
const [loaded] = useFonts({
  'poppins-regular': require('../assets/fonts/poppins-v23-latin-regular.ttf'),
  'poppins-500': require('../assets/fonts/poppins-v23-latin-500.ttf'),
  'poppins-600': require('../assets/fonts/poppins-v23-latin-600.ttf'),
  'poppins-700': require('../assets/fonts/poppins-v23-latin-700.ttf'),
});

  if (!loaded) {
    return null;
  }

  return (
    <ToastProvider>
    <ConnectionProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ConnectionProvider>
    </ToastProvider>
  );
}

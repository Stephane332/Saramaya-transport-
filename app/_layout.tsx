import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { couleurs } from '../src/theme';
import { useApp } from '../src/store/useApp';

export default function DispositionRacine() {
  const amorcer = useApp((e) => e.amorcer);

  useEffect(() => {
    amorcer();
  }, [amorcer]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: couleurs.fond },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="billet/[id]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen
            name="confirmation/[id]"
            options={{ animation: 'fade', presentation: 'fullScreenModal' }}
          />
          <Stack.Screen name="gare" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

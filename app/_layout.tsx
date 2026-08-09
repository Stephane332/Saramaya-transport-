import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { couleurs } from '../src/theme';
import { useApp } from '../src/store/useApp';
import { initialiserNotifications } from '../src/lib/notifications';

export default function DispositionRacine() {
  const voyageur = useApp((e) => e.voyageur);
  const segments = useSegments();
  const router = useRouter();

  // Redirige vers l'ouverture de compte tant qu'aucun voyageur n'existe.
  useEffect(() => {
    const surBienvenue = segments[0] === 'bienvenue';
    if (!voyageur && !surBienvenue) {
      router.replace('/bienvenue');
    } else if (voyageur && surBienvenue) {
      router.replace('/');
    }
  }, [voyageur, segments, router]);

  useEffect(() => {
    initialiserNotifications();
  }, []);

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
          <Stack.Screen name="bienvenue" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="billet/[id]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="colis/[id]" options={{ animation: 'slide_from_bottom' }} />
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

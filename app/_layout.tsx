import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { couleurs, espace, rayon, typo } from '../src/theme';
import { useApp } from '../src/store/useApp';
import { initialiserNotifications } from '../src/lib/notifications';
import { MODE_AGENT } from '../src/lib/modeAgent';

/**
 * Filet de sécurité : expo-router affiche ce composant au lieu d'un écran blanc
 * si une erreur non rattrapée survient au rendu.
 *
 * Un plantage ne doit jamais ressembler à une perte de données — les voyages sont
 * enregistrés sur le téléphone et survivent à l'erreur. On le dit clairement, et
 * on propose de recharger plutôt que de laisser le voyageur devant un écran mort,
 * potentiellement à la gare, à trente minutes de son départ.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <View style={styles.erreurFond}>
      <ScrollView contentContainerStyle={styles.erreurContenu}>
        <Text style={[typo.titre, { color: couleurs.texte }]}>Une erreur est survenue</Text>
        <Text style={[typo.corps, { color: couleurs.texteDoux }]}>
          Vos voyages et vos billets sont enregistrés sur ce téléphone : ils sont intacts.
          Rechargez l'écran pour continuer.
        </Text>

        <Pressable onPress={() => retry()} style={styles.erreurBouton}>
          <Text style={[typo.corpsFort, { color: couleurs.texte }]}>Recharger</Text>
        </Pressable>

        <Text style={[typo.minuscule, { color: couleurs.texteFaible }]}>
          DÉTAIL TECHNIQUE
        </Text>
        <Text style={[typo.petit, { color: couleurs.texteFaible }]} selectable>
          {error?.message ?? 'Erreur inconnue'}
        </Text>
      </ScrollView>
    </View>
  );
}

export default function DispositionRacine() {
  const voyageur = useApp((e) => e.voyageur);
  const charge = useApp((e) => e.charge);
  const segments = useSegments();
  const router = useRouter();

  /**
   * Aiguillage vers l'ouverture de compte.
   *
   * `charge` est indispensable : la relecture du contenu enregistré est
   * asynchrone, et pendant ce court instant `voyageur` vaut null même pour un
   * client inscrit depuis des mois. Rediriger avant la fin de la relecture
   * l'enverrait recréer un compte par-dessus le sien.
   */
  useEffect(() => {
    if (!charge) return;
    const surBienvenue = segments[0] === 'bienvenue';
    if (!voyageur && !surBienvenue) {
      router.replace('/bienvenue');
    } else if (voyageur && surBienvenue) {
      router.replace('/');
    }
  }, [charge, voyageur, segments, router]);

  useEffect(() => {
    initialiserNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {!charge ? (
          <View style={styles.chargement}>
            <ActivityIndicator color={couleurs.marqueVif} />
          </View>
        ) : (
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
            {/* Écrans du personnel : absents de l'application des voyageurs. */}
            <Stack.Screen
              name="gare"
              options={{
                animation: 'slide_from_bottom',
                // `href: null` retire aussi l'écran du plan de navigation.
                ...(MODE_AGENT ? {} : { href: null }),
              }}
              redirect={!MODE_AGENT}
            />
            <Stack.Screen
              name="caisse"
              options={{ animation: 'slide_from_bottom', ...(MODE_AGENT ? {} : { href: null }) }}
              redirect={!MODE_AGENT}
            />
          </Stack>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  chargement: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  erreurFond: { flex: 1, backgroundColor: couleurs.fond },
  erreurContenu: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: espace.xl,
    gap: espace.md,
  },
  erreurBouton: {
    alignSelf: 'flex-start',
    backgroundColor: couleurs.marque,
    paddingHorizontal: espace.xl,
    paddingVertical: espace.md,
    borderRadius: rayon.lg,
    marginVertical: espace.sm,
  },
});

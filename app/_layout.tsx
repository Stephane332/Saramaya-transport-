import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { couleurs, espace, rayon, typo } from '../src/theme';
import { useApp } from '../src/store/useApp';
import { EcranLancement } from '../src/components/EcranLancement';
import { initialiserNotifications } from '../src/lib/notifications';

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
  const charge = useApp((e) => e.charge);
  /**
   * L'animation de lancement et la relecture des données avancent en parallèle.
   * On ne découvre l'application que lorsque les deux sont terminées : ni un écran
   * vide pendant l'animation, ni une animation tronquée par une relecture rapide.
   */
  const [lancementTermine, setLancementTermine] = useState(false);

  /*
   * L'aiguillage vers l'ouverture de compte ne se fait pas ici.
   *
   * Naviguer impérativement depuis la disposition racine échoue : au premier rendu,
   * le navigateur n'est pas encore monté, et expo-router refuse le déplacement.
   * L'aiguillage est donc déclaratif, dans les écrans concernés — les onglets
   * renvoient vers l'accueil s'il n'y a pas de compte, et l'accueil renvoie vers
   * l'application dès qu'il y en a un. Chacun décide au bon moment, une fois monté.
   */

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
          {/*
            Écrans du personnel. Le verrou n'est pas ici mais dans les écrans
            eux-mêmes : hors mode agent, chacun renvoie immédiatement à l'accueil.
            Un `redirect` posé sur la déclaration de route se déclenche avant que le
            navigateur soit monté et fait tomber l'application à son lancement.
          */}
          <Stack.Screen name="gare" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="caisse" options={{ animation: 'slide_from_bottom' }} />
        </Stack>

        {/* Lancement : superposé au navigateur, jamais substitué à lui. */}
        {!lancementTermine ? (
          <EcranLancement peutPartir={charge} onTermine={() => setLancementTermine(true)} />
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
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

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Bouton, Carte, Ecran, Txt } from '../../src/components/base';
import { useApp } from '../../src/store/useApp';
import { couleurs, espace } from '../../src/theme';

export default function DispositionOnglets() {
  const voyageur = useApp((e) => e.voyageur);
  const charge = useApp((e) => e.charge);
  const erreurChargement = useApp((e) => e.erreurChargement);

  /*
   * Si la relecture a échoué, l'application voit un compte vide — et sans cette
   * garde elle enverrait le client vers l'ouverture de compte, où il en créerait
   * un **par-dessus le sien**. Le magasin prépare depuis toujours un message pour
   * ce cas ; il n'était affiché nulle part. Il l'est ici, avant toute décision.
   */
  if (charge && !voyageur && erreurChargement) {
    return <LectureImpossible message={erreurChargement} />;
  }

  // Tant que le contenu enregistré n'est pas relu, on ne conclut rien : un client
  // inscrit depuis des mois ne doit jamais être renvoyé vers l'ouverture de compte.
  if (charge && !voyageur) return <Redirect href="/bienvenue" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: couleurs.marqueVif,
        tabBarInactiveTintColor: couleurs.texteFaible,
        tabBarStyle: {
          position: 'absolute',
          borderTopColor: couleurs.bordure,
          borderTopWidth: 1,
          backgroundColor:
            Platform.OS === 'web' ? 'rgba(16,11,22,0.94)' : 'rgba(16,11,22,0.72)',
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.1 },
        tabBarBackground: () =>
          Platform.OS === 'web' ? null : (
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reserver"
        options={{
          title: 'Réserver',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size + 4} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="colis"
        options={{
          title: 'Colis',
          tabBarIcon: ({ color, size }) => <Ionicons name="cube" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="voyages"
        options={{
          title: 'Voyages',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

/**
 * La relecture des données a échoué.
 *
 * Le réflexe naturel de l'application — « pas de compte, donc nouveau client » —
 * serait ici une faute grave : les données sont probablement intactes sur le
 * téléphone, et créer un compte par-dessus les remplacerait pour de bon. On
 * s'arrête donc, on explique, et on propose d'abord de réessayer.
 *
 * L'ouverture d'un compte reste possible, mais après l'avertissement, et jamais
 * comme geste par défaut. C'est le seul écran de l'application qui préfère bloquer
 * plutôt que de laisser passer.
 */
function LectureImpossible({ message }: { message: string }) {
  const router = useRouter();
  const [malgreTout, setMalgreTout] = useState(false);

  return (
    <Ecran>
      <Txt v="titre">Données illisibles pour le moment</Txt>

      <Carte style={{ borderColor: 'rgba(245,165,36,0.45)', gap: espace.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.sm }}>
          <Ionicons name="warning" size={20} color={couleurs.attention} />
          <Txt v="corpsFort" couleur={couleurs.attention}>
            Ne créez pas de nouveau compte
          </Txt>
        </View>
        <Txt v="petit" couleur={couleurs.texteDoux}>
          {message}
        </Txt>
      </Carte>

      <Carte>
        <Txt v="petit" couleur={couleurs.texteFaible}>
          Fermez complètement l'application, puis rouvrez-la. Vos voyages, vos billets et
          vos colis sont enregistrés sur ce téléphone : ils n'ont pas été envoyés ailleurs,
          et ils n'ont pas été effacés.
        </Txt>
      </Carte>

      {!malgreTout ? (
        <Bouton
          titre="Créer un compte quand même"
          sousTitre="À ne faire que si vous n'aviez pas encore de compte"
          variante="fantome"
          onPress={() => setMalgreTout(true)}
        />
      ) : (
        <>
          <Carte style={{ borderColor: 'rgba(242,84,91,0.45)' }}>
            <Txt v="petit" couleur={couleurs.texteDoux}>
              Si un compte existait sur ce téléphone, en créer un autre le remplacera
              définitivement, avec tout son historique.
            </Txt>
          </Carte>
          <Bouton
            titre="Je n'avais pas de compte, continuer"
            variante="danger"
            onPress={() => router.replace('/bienvenue')}
          />
          <Bouton titre="Revenir en arrière" variante="secondaire" onPress={() => setMalgreTout(false)} />
        </>
      )}
    </Ecran>
  );
}

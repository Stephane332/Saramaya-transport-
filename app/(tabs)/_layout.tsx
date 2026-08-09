import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useApp } from '../../src/store/useApp';
import { couleurs } from '../../src/theme';

export default function DispositionOnglets() {
  const voyageur = useApp((e) => e.voyageur);
  const charge = useApp((e) => e.charge);

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

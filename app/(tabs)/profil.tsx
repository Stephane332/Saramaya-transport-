import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Bouton, Carte, Ecran, Section, Trait, Txt } from '../../src/components/base';
import { initiales, telephone } from '../../src/lib/format';
import { useApp, voyagesEffectues } from '../../src/store/useApp';
import { couleurs, degrades, espace, rayon } from '../../src/theme';

export default function Profil() {
  const router = useRouter();
  const voyageur = useApp((e) => e.voyageur);
  const reservations = useApp((e) => e.reservations);
  const reinitialiser = useApp((e) => e.reinitialiser);

  if (!voyageur) return null;
  const effectues = voyagesEffectues(reservations);

  return (
    <Ecran>
      <Txt v="titre">Profil</Txt>

      {/*
        La carte d'identité du voyageur. C'est elle qu'on présente au guichet :
        elle supprime la ressaisie que l'agent demande aujourd'hui à chaque passage.
      */}
      <Animated.View entering={FadeInDown.springify().damping(18)}>
        <LinearGradient colors={degrades.marque} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.carteIdentite}>
          <View style={styles.enteteIdentite}>
            <View style={styles.avatar}>
              <Txt v="sousTitre" couleur="#fff">
                {initiales(voyageur.prenom, voyageur.nom)}
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="minuscule" couleur="rgba(255,255,255,0.8)">
                VOYAGEUR SARAMAYA
              </Txt>
              <Txt v="sousTitre" couleur="#fff">
                {voyageur.nom} {voyageur.prenom}
              </Txt>
            </View>
          </View>

          <View style={styles.grilleIdentite}>
            <View>
              <Txt v="minuscule" couleur="rgba(255,255,255,0.75)">
                TÉLÉPHONE
              </Txt>
              <Txt v="corpsFort" couleur="#fff">
                {telephone(voyageur.telephone)}
              </Txt>
            </View>
            <View>
              <Txt v="minuscule" couleur="rgba(255,255,255,0.75)">
                CNIB
              </Txt>
              <Txt v="corpsFort" couleur="#fff">
                {voyageur.cnib ?? '—'}
              </Txt>
            </View>
            <View>
              <Txt v="minuscule" couleur="rgba(255,255,255,0.75)">
                VOYAGES
              </Txt>
              <Txt v="corpsFort" couleur="#fff">
                {effectues.length}
              </Txt>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Carte>
        <View style={{ flexDirection: 'row', gap: espace.sm }}>
          <Ionicons name="shield-checkmark-outline" size={18} color={couleurs.succes} />
          <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
            Présentez cet écran au guichet : le nom, le contact et la CNIB exigée dès 18 ans y
            sont déjà. L'agent n'a plus rien à vous demander.
          </Txt>
        </View>
      </Carte>

      <Section>Rappels</Section>
      <Carte>
        <Reglage icone="notifications" titre="Rappel la veille du départ" actif />
        <Trait />
        <Reglage icone="alarm" titre="Alarme de confirmation" detail="60 minutes avant le départ" actif />
        <Trait />
        <Reglage icone="hourglass" titre="Alerte d'expiration" detail="7 jours et 2 jours avant" actif />
        <Trait />
        <Reglage icone="chatbox" titre="Repli par SMS" detail="Si la notification ne passe pas" actif />
      </Carte>

      <Section>Données</Section>
      <Carte>
        <View style={{ flexDirection: 'row', gap: espace.sm }}>
          <Ionicons name="lock-closed-outline" size={18} color={couleurs.texteDoux} />
          <Txt v="petit" couleur={couleurs.texteFaible} style={{ flex: 1 }}>
            Vos informations restent sur ce téléphone. Rien n'est envoyé à un serveur tant que
            la compagnie n'a pas ouvert son système.
          </Txt>
        </View>
      </Carte>

      <Section>Démonstration</Section>
      <Bouton
        titre="Voir l'écran de la gare"
        sousTitre="Ce que verraient les agents"
        variante="secondaire"
        onPress={() => router.push('/gare')}
      />
      <Bouton
        titre="Réinitialiser les données de démonstration"
        variante="fantome"
        onPress={reinitialiser}
      />
    </Ecran>
  );
}

function Reglage({
  icone,
  titre,
  detail,
  actif,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titre: string;
  detail?: string;
  actif: boolean;
}) {
  return (
    <View style={styles.reglage}>
      <Ionicons name={icone} size={18} color={couleurs.magentaVif} />
      <View style={{ flex: 1 }}>
        <Txt v="corpsFort">{titre}</Txt>
        {detail ? (
          <Txt v="minuscule" couleur={couleurs.texteFaible}>
            {detail}
          </Txt>
        ) : null}
      </View>
      <View style={[styles.interrupteur, actif && styles.interrupteurActif]}>
        <View style={[styles.pastilleInterrupteur, actif && { alignSelf: 'flex-end' }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carteIdentite: { borderRadius: rayon.xl, padding: espace.lg, gap: espace.lg },
  enteteIdentite: { flexDirection: 'row', alignItems: 'center', gap: espace.md },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  grilleIdentite: { flexDirection: 'row', justifyContent: 'space-between' },
  reglage: { flexDirection: 'row', alignItems: 'center', gap: espace.md, paddingVertical: espace.sm },
  interrupteur: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 3,
    justifyContent: 'center',
  },
  interrupteurActif: { backgroundColor: couleurs.magenta },
  pastilleInterrupteur: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
});

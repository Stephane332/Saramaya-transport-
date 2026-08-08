/**
 * Plan du bus. Le voyageur choisit sa place lui-même, là où elle est aujourd'hui
 * écrite à la main sur le ticket au guichet.
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { PLANS_BUS } from '../data/reseau';
import type { Classe } from '../types';
import { couleurs, degrades, espace, rayon } from '../theme';
import { Txt } from './base';

interface Props {
  classe: Classe;
  occupes: number[];
  choisi: number | null;
  onChoisir: (siege: number) => void;
}

export function PlanSieges({ classe, occupes, choisi, onChoisir }: Props) {
  const plan = PLANS_BUS[classe];
  const parRangee = plan.gauche + plan.droite;
  const occupesSet = new Set(occupes);

  const choisir = (n: number) => {
    if (occupesSet.has(n)) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChoisir(n);
  };

  const rangees = Array.from({ length: plan.rangees }, (_, r) => {
    const base = r * parRangee;
    return {
      gauche: Array.from({ length: plan.gauche }, (_, i) => base + i + 1),
      droite: Array.from({ length: plan.droite }, (_, i) => base + plan.gauche + i + 1),
    };
  });
  const fond = Array.from(
    { length: plan.fond },
    (_, i) => plan.rangees * parRangee + i + 1,
  );

  return (
    <View style={styles.cabine}>
      <View style={styles.avant}>
        <Ionicons name="person" size={13} color={couleurs.texteFaible} />
        <Txt v="minuscule" couleur={couleurs.texteFaible}>
          CONDUCTEUR
        </Txt>
      </View>

      {rangees.map((rangee, index) => (
        <Animated.View
          key={index}
          entering={FadeIn.delay(index * 22)}
          style={styles.rangee}
        >
          <View style={styles.groupe}>
            {rangee.gauche.map((n) => (
              <Siege
                key={n}
                numero={n}
                occupe={occupesSet.has(n)}
                choisi={choisi === n}
                classe={classe}
                onPress={() => choisir(n)}
              />
            ))}
          </View>
          <View style={styles.couloir}>
            <Txt v="minuscule" couleur="rgba(255,255,255,0.14)">
              {index + 1}
            </Txt>
          </View>
          <View style={styles.groupe}>
            {rangee.droite.map((n) => (
              <Siege
                key={n}
                numero={n}
                occupe={occupesSet.has(n)}
                choisi={choisi === n}
                classe={classe}
                onPress={() => choisir(n)}
              />
            ))}
          </View>
        </Animated.View>
      ))}

      <View style={styles.banquette}>
        {fond.map((n) => (
          <Siege
            key={n}
            numero={n}
            occupe={occupesSet.has(n)}
            choisi={choisi === n}
            classe={classe}
            onPress={() => choisir(n)}
          />
        ))}
      </View>

      <View style={styles.legende}>
        <Puce couleur={couleurs.surfaceHaute} bordure={couleurs.bordureForte} texte="Libre" />
        <Puce couleur="rgba(255,255,255,0.05)" bordure="transparent" texte="Occupé" />
        <Puce
          couleur={classe === 'VIP' ? couleurs.vip : couleurs.marque}
          bordure="transparent"
          texte="Votre place"
        />
      </View>
    </View>
  );
}

function Siege({
  numero,
  occupe,
  choisi,
  classe,
  onPress,
}: {
  numero: number;
  occupe: boolean;
  choisi: boolean;
  classe: Classe;
  onPress: () => void;
}) {
  if (choisi) {
    return (
      <Pressable onPress={onPress}>
        <LinearGradient
          colors={classe === 'VIP' ? degrades.vip : degrades.marque}
          style={styles.siege}
        >
          <Ionicons
            name="checkmark"
            size={14}
            color={classe === 'VIP' ? '#3B2A05' : '#fff'}
          />
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={occupe}>
      <View style={[styles.siege, occupe ? styles.siegeOccupe : styles.siegeLibre]}>
        <Txt
          v="minuscule"
          couleur={occupe ? 'rgba(255,255,255,0.18)' : couleurs.texteDoux}
          style={{ fontSize: 10 }}
        >
          {numero}
        </Txt>
      </View>
    </Pressable>
  );
}

function Puce({ couleur, bordure, texte }: { couleur: string; bordure: string; texte: string }) {
  return (
    <View style={styles.itemLegende}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 4,
          backgroundColor: couleur,
          borderWidth: 1,
          borderColor: bordure,
        }}
      />
      <Txt v="minuscule" couleur={couleurs.texteFaible}>
        {texte}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  cabine: {
    backgroundColor: couleurs.surfaceBasse,
    borderRadius: rayon.xl,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espace.md,
    gap: 6,
  },
  avant: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingBottom: espace.sm,
    marginBottom: espace.xs,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  rangee: { flexDirection: 'row', alignItems: 'center' },
  groupe: { flexDirection: 'row', gap: 6 },
  couloir: { flex: 1, alignItems: 'center' },
  banquette: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: espace.sm,
    paddingTop: espace.sm,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  siege: {
    width: 32,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siegeLibre: {
    backgroundColor: couleurs.surfaceHaute,
    borderWidth: 1,
    borderColor: couleurs.bordureForte,
  },
  siegeOccupe: { backgroundColor: 'rgba(255,255,255,0.04)' },
  legende: {
    flexDirection: 'row',
    gap: espace.lg,
    justifyContent: 'center',
    marginTop: espace.md,
    paddingTop: espace.md,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  itemLegende: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

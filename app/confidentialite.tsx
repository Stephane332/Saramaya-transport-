/**
 * Confidentialité et conditions, lisibles dans l'application.
 *
 * Cet écran remplit deux obligations d'un seul geste. Les boutiques exigent une
 * politique de confidentialité accessible à une adresse publique : la version web
 * de l'application publie cet écran à `/confidentialite`, et c'est ce lien qui est
 * déclaré à l'App Store et à Google Play. Et le voyageur, lui, peut la lire depuis
 * son profil, **sans réseau** — ce qui compte dans une gare.
 *
 * Le texte vient de `src/data/mentionsLegales.ts`, seule source. Rien n'est recopié.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Carte, Ecran, EnTeteRetour, Section, Trait, Txt } from '../src/components/base';
import {
  CONDITIONS,
  CONFIDENTIALITE,
  REVISION_MENTIONS,
  type SectionLegale,
} from '../src/data/mentionsLegales';
import { useRetourMateriel } from '../src/lib/retour';
import { couleurs, espace, rayon } from '../src/theme';

type Onglet = 'CONFIDENTIALITE' | 'CONDITIONS';

export default function Confidentialite() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<Onglet>('CONFIDENTIALITE');

  const retour = () => router.back();
  useRetourMateriel(true, retour);

  const sections = onglet === 'CONFIDENTIALITE' ? CONFIDENTIALITE : CONDITIONS;

  return (
    <Ecran>
      <EnTeteRetour onRetour={retour} titre="Confidentialité" />

      <View style={styles.selecteur}>
        <Onglet2
          actif={onglet === 'CONFIDENTIALITE'}
          libelle="Vos données"
          onPress={() => setOnglet('CONFIDENTIALITE')}
        />
        <Onglet2
          actif={onglet === 'CONDITIONS'}
          libelle="Conditions"
          onPress={() => setOnglet('CONDITIONS')}
        />
      </View>

      <Carte style={{ borderColor: 'rgba(46,204,143,0.35)' }}>
        <View style={{ flexDirection: 'row', gap: espace.sm }}>
          <Ionicons name="lock-closed" size={18} color={couleurs.succes} />
          <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
            Cette page fonctionne sans réseau, comme le reste de l'application. Elle décrit
            ce que fait le logiciel aujourd'hui, pas ce qu'il est prévu qu'il fasse.
          </Txt>
        </View>
      </Carte>

      {/*
        La clé de l'animation change avec l'onglet : sans elle, React réutiliserait
        les mêmes vues et le texte changerait sans transition, comme un défaut
        d'affichage.
      */}
      <Animated.View key={onglet} entering={FadeIn.duration(220)} style={{ gap: espace.lg }}>
        {sections.map((s) => (
          <BlocLegal key={s.titre} section={s} />
        ))}
      </Animated.View>

      <Trait />
      <Txt v="minuscule" couleur={couleurs.texteFaible} style={{ textAlign: 'center' }}>
        DERNIÈRE MISE À JOUR · {REVISION_MENTIONS}
      </Txt>
    </Ecran>
  );
}

function BlocLegal({ section }: { section: SectionLegale }) {
  return (
    <View style={{ gap: espace.sm }}>
      <Section>{section.titre}</Section>
      <Carte style={{ gap: espace.md }}>
        {section.paragraphes.map((p, i) => (
          <Txt key={i} v="petit" couleur={couleurs.texteDoux}>
            {p.replace(/\*\*/g, '')}
          </Txt>
        ))}
        {section.points?.length ? (
          <View style={{ gap: espace.sm }}>
            {section.points.map((point, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: espace.sm }}>
                <Ionicons
                  name="ellipse"
                  size={6}
                  color={couleurs.marqueVif}
                  style={{ marginTop: 7 }}
                />
                <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
                  {point.replace(/\*\*/g, '')}
                </Txt>
              </View>
            ))}
          </View>
        ) : null}
      </Carte>
    </View>
  );
}

function Onglet2({
  actif,
  libelle,
  onPress,
}: {
  actif: boolean;
  libelle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1 }}
      accessibilityRole="tab"
      accessibilityState={{ selected: actif }}
    >
      <View style={[styles.onglet, actif && styles.ongletActif]}>
        <Txt v="corpsFort" couleur={actif ? couleurs.texte : couleurs.texteFaible}>
          {libelle}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  selecteur: { flexDirection: 'row', gap: espace.sm },
  onglet: {
    alignItems: 'center',
    paddingVertical: espace.md,
    borderRadius: rayon.md,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  ongletActif: { borderColor: couleurs.marqueVif, backgroundColor: 'rgba(216,31,38,0.12)' },
});

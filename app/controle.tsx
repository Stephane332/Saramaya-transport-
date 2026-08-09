/**
 * Contrôle à la porte du bus — côté agent.
 *
 * L'agent scanne le QR du voyageur et obtient, **en une seconde et sans réseau** :
 * le siège, le nom, le trajet, l'état du paiement. Aujourd'hui il déchiffre un
 * numéro de siège écrit à la main et ne sait rien du paiement ; c'est ce moment-là
 * que cet écran remplace.
 *
 * Le verdict occupe tout le haut de l'écran, en couleur : à la porte d'un car, on
 * lit une couleur, pas un paragraphe. Le détail vient dessous, pour les cas où
 * l'agent doit expliquer au voyageur.
 */

import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Bouton, Carte, Ecran, EnTeteRetour, Rangee, Section, Trait, Txt } from '../src/components/base';
import { ScannerCamera } from '../src/components/ScannerCamera';
import { LIBELLES_CLASSE, libelleLigne } from '../src/data/reseau';
import { montant } from '../src/lib/format';
import { MODE_AGENT } from '../src/lib/modeAgent';
import { verifierQrBillet, type Controle, type Verdict } from '../src/lib/billetQr';
import { couleurs, espace, rayon } from '../src/theme';

/** Habillage de chaque verdict : une couleur, une icône, une consigne. */
const HABILLAGE: Record<Verdict, { couleur: string; icone: keyof typeof Ionicons.glyphMap; titre: string }> = {
  VALIDE: { couleur: couleurs.succes, icone: 'checkmark-circle', titre: 'Laisser monter' },
  NON_PAYE: { couleur: couleurs.attention, icone: 'cash-outline', titre: 'À encaisser' },
  ANNULE: { couleur: couleurs.danger, icone: 'close-circle', titre: 'Annulé' },
  EXPIRE: { couleur: couleurs.danger, icone: 'hourglass-outline', titre: 'Expiré' },
  MAUVAIS_JOUR: { couleur: couleurs.attention, icone: 'calendar-outline', titre: 'Autre jour' },
  SIGNATURE_INVALIDE: { couleur: couleurs.danger, icone: 'warning', titre: 'Billet falsifié' },
  ILLISIBLE: { couleur: couleurs.neutre, icone: 'help-circle-outline', titre: 'Code inconnu' },
};

export default function EcranControle() {
  const router = useRouter();
  const [controle, setControle] = useState<Controle | null>(null);

  const scanner = useCallback((texte: string) => {
    setControle(verifierQrBillet(texte));
  }, []);

  // Réservé au personnel. La garde vient après les crochets, comme l'exige React.
  if (!MODE_AGENT) return <Redirect href="/" />;

  if (!controle) {
    return (
      <Ecran>
        <EnTeteRetour onRetour={() => router.back()} titre="Contrôle" icone="close" />
        <Txt v="petit" couleur={couleurs.texteFaible}>
          Scannez le QR du billet. Le siège, le nom et l'état du paiement s'affichent
          immédiatement, même sans réseau.
        </Txt>
        <ScannerCamera onScan={scanner} onSaisieManuelle={() => router.back()} />
      </Ecran>
    );
  }

  const h = HABILLAGE[controle.verdict];
  const b = controle.billet;

  return (
    <Ecran>
      <EnTeteRetour onRetour={() => router.back()} titre="Contrôle" icone="close" />

      <Animated.View entering={FadeIn.duration(160)}>
        <View style={[styles.verdict, { borderColor: `${h.couleur}66`, backgroundColor: `${h.couleur}1A` }]}>
          <Ionicons name={h.icone} size={44} color={h.couleur} />
          <Txt v="titre" couleur={h.couleur}>
            {h.titre}
          </Txt>
          <Txt v="petit" couleur={couleurs.texteDoux} style={{ textAlign: 'center' }}>
            {controle.message}
          </Txt>
        </View>
      </Animated.View>

      {b ? (
        <Animated.View entering={FadeInDown.delay(80)}>
          <Carte style={{ gap: espace.sm }}>
            {/* Le siège d'abord, en grand : c'est la première chose que l'agent cherche. */}
            <View style={styles.siege}>
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                SIÈGE
              </Txt>
              <Txt v="geant" couleur={couleurs.texte}>
                {b.s ?? '—'}
              </Txt>
              {b.s === null ? (
                <Txt v="minuscule" couleur={couleurs.texteFaible}>
                  À ATTRIBUER AU GUICHET
                </Txt>
              ) : null}
            </View>
            <Trait />
            <Rangee gauche="Voyageur" droite={b.n} fort />
            <Rangee gauche="Trajet" droite={libelleLigne(b.l)} />
            <Rangee gauche="Départ" droite={`${b.d} · ${b.h}`} />
            <Rangee gauche="Classe" droite={LIBELLES_CLASSE[b.c]} />
            <Rangee gauche="Montant" droite={montant(b.m)} />
            <Rangee gauche="Référence" droite={b.r} />
          </Carte>
        </Animated.View>
      ) : null}

      <Section>Suite</Section>
      <Bouton titre="Scanner le billet suivant" onPress={() => setControle(null)} />

      <Carte>
        <View style={{ flexDirection: 'row', gap: espace.sm }}>
          <Ionicons name="information-circle-outline" size={18} color={couleurs.texteFaible} />
          <Txt v="petit" couleur={couleurs.texteFaible} style={{ flex: 1 }}>
            La vérification est entièrement hors ligne : le billet porte sa propre
            signature. Une modification du QR — siège, date, paiement — est détectée
            aussitôt. La signature par le système de la compagnie viendra s'y substituer
            sans changer ce que voit l'agent.
          </Txt>
        </View>
      </Carte>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  verdict: {
    alignItems: 'center',
    gap: espace.sm,
    paddingVertical: espace.xl,
    paddingHorizontal: espace.lg,
    borderRadius: rayon.xl,
    borderWidth: 1,
  },
  siege: { alignItems: 'center', gap: 2, paddingVertical: espace.sm },
});

/**
 * Demander une place — et non la choisir.
 *
 * Chez Saramaya, la place est **attribuée par l'agent** au moment de l'encaissement :
 * sa billetterie affiche les places libres du départ, il en clique une, le billet
 * s'imprime avec le numéro. Le voyageur ne choisit pas. Il peut demander — on a vu
 * une passagère obtenir la place 3 en la réclamant au guichet — et l'agent honore la
 * demande si la place est libre.
 *
 * Cet écran disait autre chose. Il dessinait une cabine complète et invitait à y
 * cliquer un siège, comme le font les compagnies qui vendent en ligne. Deux
 * problèmes : le plan était inventé de bout en bout — seize rangées, soixante-neuf
 * places, aucun de ces nombres n'ayant jamais été vérifié — et le geste laissait
 * croire à une réservation de place que l'application ne peut pas garantir.
 *
 * Ne reste donc que ce qui est vrai : un numéro souhaité, facultatif, transmis avec
 * la demande. Sans plan, parce qu'on ne connaît pas la voiture ; sans promesse,
 * parce que c'est la gare qui tranche.
 */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';
import { Carte, Txt } from './base';
import { dispositionRangee, LIBELLES_CLASSE } from '../data/reseau';
import type { Classe } from '../types';
import { couleurs, espace, rayon } from '../theme';

interface Props {
  classe: Classe;
  /** Numéro souhaité, ou null quand le voyageur s'en remet à la gare. */
  valeur: number | null;
  onChange: (place: number | null) => void;
}

export function DemandeDePlace({ classe, valeur, onChange }: Props) {
  const saisir = (texte: string) => {
    const chiffres = texte.replace(/\D/g, '').slice(0, 3);
    onChange(chiffres ? Number(chiffres) : null);
  };

  return (
    <View style={{ gap: espace.md }}>
      <Carte style={{ gap: espace.sm }}>
        <View style={styles.entete}>
          <Ionicons name="information-circle-outline" size={18} color={couleurs.texteDoux} />
          <Txt v="corpsFort">C'est la gare qui attribue la place</Txt>
        </View>
        <Txt v="petit" couleur={couleurs.texteFaible}>
          Au guichet, l'agent choisit une place libre au moment où il encaisse et
          l'inscrit sur le billet. Vous pouvez demander un numéro : il part avec votre
          demande, et la gare le retient si la place est encore libre.
        </Txt>
        <Txt v="minuscule" couleur={couleurs.texteFaible}>
          {LIBELLES_CLASSE[classe].toUpperCase()} · RANGÉES EN {dispositionRangee(classe)}
        </Txt>
      </Carte>

      <View style={styles.champ}>
        <Txt v="minuscule" couleur={couleurs.texteFaible}>
          NUMÉRO SOUHAITÉ — FACULTATIF
        </Txt>
        <TextInput
          value={valeur === null ? '' : String(valeur)}
          onChangeText={saisir}
          placeholder="Aucune préférence"
          placeholderTextColor={couleurs.texteFaible}
          keyboardType="number-pad"
          style={styles.saisie}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  entete: { flexDirection: 'row', alignItems: 'center', gap: espace.sm },
  champ: {
    gap: 6,
    padding: espace.md,
    borderRadius: rayon.md,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  saisie: {
    color: couleurs.texte,
    fontSize: 20,
    letterSpacing: 1,
    paddingVertical: 4,
  },
});

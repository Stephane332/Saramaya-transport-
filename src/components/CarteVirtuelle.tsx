/**
 * La CNIB du voyageur, redessinée dans l'application.
 *
 * Une fois la carte lue, on ne renvoie pas le voyageur vers un formulaire : on lui
 * montre **sa carte**. C'est la différence entre « voici ce que j'ai extrait,
 * vérifiez champ par champ » et « voici votre carte, telle que je l'ai comprise ».
 * La seconde formulation se relit d'un coup d'œil ; la première se subit.
 *
 * Elle sert aussi au guichet. Aujourd'hui l'agent demande le nom, le prénom, le
 * numéro de CNIB, et le voyageur les dicte. Cet écran les montre.
 *
 * ## Ce que cette carte n'est pas
 *
 * **Ce n'est pas une pièce d'identité.** La loi burkinabè exige la carte physique
 * dès 18 ans à l'entrée de la gare, et rien de ce qui s'affiche sur un téléphone ne
 * la remplace. La mention est donc portée sur la carte elle-même, en clair et non
 * en petits caractères : une copie numérique qui laisserait croire le contraire
 * mettrait le voyageur en difficulté au moment le moins opportun — devant un
 * contrôle.
 *
 * Le rendu s'inspire du document réel pour être reconnaissable au premier regard,
 * mais s'en écarte volontairement — couleurs de l'application, mention « copie » —
 * pour qu'aucune confusion ne soit possible, ni pour le voyageur ni pour l'agent.
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Txt } from './base';
import type { CarteIdentite, ChampCarte, SourceChamp } from '../lib/carteIdentite';
import { couleurs, espace, rayon } from '../theme';

export function CarteVirtuelle({
  carte,
  sources,
  desaccords = [],
  photoUri,
  bande,
}: {
  carte: CarteIdentite;
  sources?: Record<ChampCarte, SourceChamp>;
  /** Champs où les deux faces se contredisent : montrés en rouge. */
  desaccords?: ChampCarte[];
  /** Image du recto, affichée à la place de la photo d'identité. */
  photoUri?: string | null;
  /** Les trois lignes du dos, si elles ont été lues. */
  bande?: string | null;
}) {
  const alerte = (champ: ChampCarte) => desaccords.includes(champ);

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)}>
      <LinearGradient
        colors={['#15303A', '#0C1D25']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.carte}
      >
        <View style={styles.entete}>
          <View style={{ flex: 1 }}>
            <Txt v="minuscule" couleur="rgba(255,255,255,0.55)">
              CARTE NATIONALE D'IDENTITÉ BURKINABÈ
            </Txt>
            <Txt v="minuscule" couleur={couleurs.attention}>
              COPIE NUMÉRIQUE
            </Txt>
          </View>
          <Ionicons name="shield-checkmark" size={18} color="rgba(255,255,255,0.35)" />
        </View>

        <View style={styles.corps}>
          <View style={styles.photo}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <Ionicons name="person" size={30} color="rgba(255,255,255,0.25)" />
            )}
          </View>

          <View style={{ flex: 1, gap: espace.sm }}>
            <Ligne libelle="NOM" valeur={carte.nom} alerte={alerte('nom')} grand />
            <Ligne libelle="PRÉNOMS" valeur={carte.prenoms} alerte={alerte('prenoms')} />
            <Ligne
              libelle="NÉ(E) LE"
              valeur={
                carte.dateNaissance
                  ? `${jolieDate(carte.dateNaissance)}${carte.lieuNaissance ? ` à ${carte.lieuNaissance}` : ''}`
                  : ''
              }
              alerte={alerte('dateNaissance')}
            />
          </View>
        </View>

        <View style={styles.bas}>
          <Ligne libelle="NUMÉRO" valeur={carte.numeroCarte} alerte={alerte('numeroCarte')} />
          <Ligne
            libelle="EXPIRE LE"
            valeur={carte.dateExpiration ? jolieDate(carte.dateExpiration) : ''}
            alerte={alerte('dateExpiration')}
          />
        </View>

        {/*
          La bande, telle qu'elle est imprimée au dos. Elle n'a pas d'usage pratique
          ici — mais c'est elle qui a fourni les champs ci-dessus, et la montrer dit
          au voyageur d'où vient ce qu'il lit.
        */}
        {bande ? (
          <View style={styles.bandeBoite}>
            {bande
              .split('\n')
              .slice(0, 3)
              .map((ligne, i) => (
                <Txt key={i} v="minuscule" couleur="rgba(255,255,255,0.45)" style={styles.bandeTexte}>
                  {ligne}
                </Txt>
              ))}
          </View>
        ) : null}

        <View style={styles.mention}>
          <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.5)" />
          <Txt v="minuscule" couleur="rgba(255,255,255,0.5)" style={{ flex: 1 }}>
            COPIE ENREGISTRÉE SUR CE TÉLÉPHONE · PRÉSENTEZ LA CARTE ORIGINALE AU CONTRÔLE
          </Txt>
        </View>
      </LinearGradient>

      {/* La provenance de chaque champ, sous la carte plutôt que dessus. */}
      {sources ? <Provenance sources={sources} /> : null}
    </Animated.View>
  );
}

/**
 * D'où viennent les champs, résumé en une ligne.
 *
 * Détailler champ par champ sous la carte la rendrait illisible. Ce qui compte est
 * la question à laquelle le voyageur veut répondre : « est-ce vérifié ou pas ? »
 */
function Provenance({ sources }: { sources: Record<ChampCarte, SourceChamp> }) {
  const compte = (s: SourceChamp) => Object.values(sources).filter((v) => v === s).length;
  const dos = compte('BANDE');
  const recto = compte('RECTO');
  const saisis = compte('SAISIE');

  const morceaux = [
    dos > 0 ? `${dos} champ${dos > 1 ? 's' : ''} lu${dos > 1 ? 's' : ''} au dos, avec clé de contrôle` : null,
    recto > 0 ? `${recto} lu${recto > 1 ? 's' : ''} au recto` : null,
    saisis > 0 ? `${saisis} corrigé${saisis > 1 ? 's' : ''} par vous` : null,
  ].filter((m): m is string => m !== null);

  if (morceaux.length === 0) return null;

  return (
    <View style={styles.provenance}>
      <Ionicons
        name={dos > 0 ? 'checkmark-circle' : 'eye-outline'}
        size={14}
        color={dos > 0 ? couleurs.succes : couleurs.texteFaible}
      />
      <Txt v="minuscule" couleur={couleurs.texteFaible} style={{ flex: 1 }}>
        {morceaux.join(' · ').toUpperCase()}
      </Txt>
    </View>
  );
}

function Ligne({
  libelle,
  valeur,
  alerte,
  grand = false,
}: {
  libelle: string;
  valeur: string;
  alerte: boolean;
  grand?: boolean;
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Txt v="minuscule" couleur="rgba(255,255,255,0.45)">
          {libelle}
        </Txt>
        {alerte ? <Ionicons name="alert-circle" size={12} color={couleurs.danger} /> : null}
      </View>
      <Txt
        v={grand ? 'sousTitre' : 'corpsFort'}
        couleur={alerte ? couleurs.danger : '#FFFFFF'}
        numberOfLines={1}
      >
        {valeur || '—'}
      </Txt>
    </View>
  );
}

/** « 2004-10-01 » devient « 01/10/2004 », comme sur la carte. */
function jolieDate(iso: string): string {
  const [a, m, j] = iso.split('-');
  return a && m && j ? `${j}/${m}/${a}` : iso;
}

const styles = StyleSheet.create({
  carte: {
    borderRadius: rayon.xl,
    padding: espace.lg,
    gap: espace.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  entete: { flexDirection: 'row', alignItems: 'center', gap: espace.sm },
  corps: { flexDirection: 'row', gap: espace.md },
  photo: {
    width: 74,
    height: 92,
    borderRadius: rayon.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espace.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: espace.md,
  },
  bandeBoite: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: rayon.sm,
    paddingVertical: espace.sm,
    paddingHorizontal: espace.md,
  },
  bandeTexte: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  mention: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  provenance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: espace.xs,
    paddingTop: espace.sm,
  },
});

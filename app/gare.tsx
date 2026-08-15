/**
 * Aperçu côté gare.
 *
 * Ce que verront les agents une fois l'application connectée au système de la
 * compagnie : la liste des passagers d'un départ, avec leur statut en direct, pour
 * ne plus appeler tout le monde un par un.
 *
 * Ici, rien n'est inventé : l'écran affiche les réservations réelles présentes dans
 * l'application. Tant qu'il n'y a pas de système partagé, il ne montre que les
 * vôtres — d'où l'aperçu. Branché sur la compagnie, il affichera tous les voyageurs.
 */

import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  BadgeClasse,
  Bouton,
  Carte,
  Ecran,
  EnAttenteDeLaCompagnie,
  Section,
  Txt,
} from '../src/components/base';
import { MINUTES_LIBERATION_PLACE, ligneParId } from '../src/data/reseau';
import { montant, telephone } from '../src/lib/format';
import { etatFonction } from '../src/lib/disponibilite';
import { MODE_AGENT } from '../src/lib/modeAgent';
import { prochainVoyage, useApp } from '../src/store/useApp';
import { couleurs, espace, rayon } from '../src/theme';
import type { Reservation } from '../src/types';

/** Traduit le statut d'une réservation en ce que l'agent doit en faire. */
function etatAgent(r: Reservation): { texte: string; couleur: string; appel: boolean } {
  switch (r.statut) {
    case 'CONFIRMEE':
      return { texte: 'Confirmé', couleur: couleurs.succes, appel: false };
    case 'PAYEE':
      return { texte: 'Payé', couleur: couleurs.classique, appel: false };
    case 'OPTION':
      return r.paiementDeclareLe
        ? { texte: 'Paiement déclaré', couleur: couleurs.attention, appel: true }
        : { texte: 'À payer', couleur: couleurs.attention, appel: false };
    case 'ANNULEE':
      return { texte: 'Annulé', couleur: couleurs.danger, appel: false };
    case 'EMBARQUE':
      return { texte: 'Embarqué', couleur: couleurs.neutre, appel: false };
    /*
     * Les trois derniers cas tombaient dans un `default` qui affichait le nom
     * technique du statut — « SANS_REPONSE » en toutes lettres sur l'écran d'un
     * agent. Ce sont pourtant les états qui demandent le plus d'attention : ils
     * sont donc nommés, et « sans réponse » est précisément le cas où un appel
     * reste nécessaire.
     */
    case 'SANS_REPONSE':
      return { texte: 'Sans réponse', couleur: couleurs.danger, appel: true };
    case 'REPORTEE':
      return { texte: 'Reporté', couleur: couleurs.neutre, appel: false };
    case 'NO_SHOW':
      return { texte: 'Absent', couleur: couleurs.danger, appel: false };
  }
}

export default function EcranGare() {
  const router = useRouter();
  const reservations = useApp((e) => e.reservations);
  const voyageur = useApp((e) => e.voyageur);
  const caisse = useApp((e) => e.caisse);

  // On regroupe autour du prochain départ réel du voyageur, s'il y en a un.
  const prochain = useMemo(() => prochainVoyage(reservations), [reservations]);
  const duMemeDepart = useMemo(
    () =>
      prochain
        ? reservations.filter(
            (r) => r.ligneId === prochain.ligneId && r.date === prochain.date && r.heure === prochain.heure,
          )
        : [],
    [reservations, prochain],
  );

  const ligne = prochain ? ligneParId(prochain.ligneId) : null;
  const aTraiter = duMemeDepart.filter((r) => etatAgent(r).appel).length;
  const confirmes = duMemeDepart.filter((r) => ['CONFIRMEE', 'PAYEE'].includes(r.statut)).length;

  // Réservé au personnel. La garde vient après les crochets : leur nombre doit
  // rester constant d'un rendu à l'autre, c'est la règle de React.
  if (!MODE_AGENT) return <Redirect href="/" />;

  return (
    <Ecran>
      <View style={styles.entre}>
        <Pressable onPress={() => router.back()} style={styles.retour}>
          <Ionicons name="chevron-back" size={22} color={couleurs.texte} />
        </Pressable>
        <View style={styles.etiquetteApercu}>
          <Txt v="minuscule" couleur={couleurs.attention}>
            APERÇU — CÔTÉ GARE
          </Txt>
        </View>
      </View>

      <View>
        <Txt v="titre">Départs</Txt>
        <Txt v="petit" couleur={couleurs.texteFaible}>
          {format(new Date(), 'EEEE d MMMM', { locale: fr })}
        </Txt>
      </View>

      <EnAttenteDeLaCompagnie {...etatFonction('MANIFESTE_COMPLET')} />

      {!prochain || !ligne ? (
        <Carte>
          <Txt v="corpsFort">Aucun départ à afficher</Txt>
          <Txt v="petit" couleur={couleurs.texteFaible}>
            Créez une réservation depuis l'onglet « Réserver » : elle apparaîtra ici, comme
            l'agent la verrait.
          </Txt>
        </Carte>
      ) : (
        <>
          <Animated.View entering={FadeInDown.springify().damping(18)}>
            <LinearGradient
              colors={['rgba(46,204,143,0.20)', 'rgba(23,145,106,0.05)']}
              style={styles.bandeauGain}
            >
              <Ionicons name="call-outline" size={22} color={couleurs.succes} />
              <View style={{ flex: 1 }}>
                <Txt v="sousTitre" couleur={couleurs.succes}>
                  {aTraiter} appel{aTraiter > 1 ? 's' : ''} à passer
                </Txt>
                <Txt v="petit" couleur={couleurs.texteDoux}>
                  {ligne.origine} → {ligne.destination} · {prochain.heure} ·{' '}
                  {confirmes} confirmé{confirmes > 1 ? 's' : ''} sans un appel
                </Txt>
              </View>
            </LinearGradient>
          </Animated.View>

          <Carte>
            <View style={styles.entre}>
              <Txt v="corpsFort">Remplissage</Txt>
              <Txt v="petit" couleur={couleurs.texteFaible}>
                {duMemeDepart.filter((r) => r.statut !== 'ANNULEE').length} réservation
                {duMemeDepart.filter((r) => r.statut !== 'ANNULEE').length > 1 ? 's' : ''}
              </Txt>
            </View>
            <Txt v="petit" couleur={couleurs.texteFaible}>
              À {MINUTES_LIBERATION_PLACE} minutes du départ, les places non retirées sont
              proposées à la liste d'attente.
            </Txt>
          </Carte>

          <Section>Manifeste</Section>
          {duMemeDepart.map((r, i) => (
            <RangeePassager key={r.id} reservation={r} nomVoyageur={`${voyageur?.nom ?? ''} ${voyageur?.prenom ?? ''}`} index={i} />
          ))}
        </>
      )}

      <Section>Embarquement</Section>
      <Bouton
        titre="Contrôler les billets"
        sousTitre="Scanner le QR à la porte du bus — fonctionne sans réseau"
        icone={<Ionicons name="scan-outline" size={18} color={couleurs.texte} />}
        onPress={() => router.push('/controle')}
      />

      <Section>Encaissement</Section>
      <Bouton
        titre={caisse ? `Ma caisse · ${caisse.nom}` : 'Configurer ma caisse'}
        sousTitre={
          caisse
            ? `Orange Money ${telephone(caisse.numeroOrangeMoney)}`
            : 'Numéro Orange Money du guichet'
        }
        variante="secondaire"
        icone={<Ionicons name="cash-outline" size={18} color={couleurs.texteDoux} />}
        onPress={() => router.push('/caisse')}
      />
    </Ecran>
  );
}

function RangeePassager({
  reservation,
  nomVoyageur,
  index,
}: {
  reservation: Reservation;
  nomVoyageur: string;
  index: number;
}) {
  const e = etatAgent(reservation);
  return (
    <Animated.View entering={FadeIn.delay(Math.min(index, 10) * 40)}>
      <View style={[styles.rangee, e.appel && styles.rangeeUrgente]}>
        <View style={[styles.siegeRond, { borderColor: `${e.couleur}66` }]}>
          <Txt v="minuscule" couleur={e.couleur}>
            {reservation.siege ?? '—'}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="corpsFort" numberOfLines={1}>
            {nomVoyageur.trim() || 'Voyageur'}
          </Txt>
          <Txt v="minuscule" couleur={couleurs.texteFaible}>
            RÉF {reservation.reference} · {montant(reservation.montant)}
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <BadgeClasse classe={reservation.classe} petit />
          <View style={[styles.etat, { backgroundColor: `${e.couleur}1E`, borderColor: `${e.couleur}55` }]}>
            <Txt v="minuscule" couleur={e.couleur}>
              {e.texte.toUpperCase()}
            </Txt>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  entre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  retour: {
    width: 40,
    height: 40,
    borderRadius: rayon.rond,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.surfaceHaute,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  etiquetteApercu: {
    borderRadius: rayon.rond,
    borderWidth: 1,
    borderColor: 'rgba(245,165,36,0.4)',
    backgroundColor: 'rgba(245,165,36,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bandeauGain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.md,
    padding: espace.lg,
    borderRadius: rayon.xl,
    borderWidth: 1,
    borderColor: 'rgba(46,204,143,0.35)',
  },
  rangee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.md,
    paddingVertical: espace.md,
    paddingHorizontal: espace.md,
    borderRadius: rayon.md,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  rangeeUrgente: { borderColor: 'rgba(240,78,55,0.45)', backgroundColor: 'rgba(240,78,55,0.07)' },
  siegeRond: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  etat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: rayon.rond,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

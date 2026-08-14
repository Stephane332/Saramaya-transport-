import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Bus3D } from '../../src/components/Bus3D';
import { CarteSpatiale } from '../../src/components/CarteSpatiale';
import { LogoSaramaya } from '../../src/components/LogoSaramaya';
import {
  BadgeClasse,
  BadgeStatut,
  Bouton,
  Carte,
  Ecran,
  Section,
  Trait,
  Txt,
} from '../../src/components/base';
import { LIGNES, ligneParId } from '../../src/data/reseau';
import { MODE_AGENT } from '../../src/lib/modeAgent';
import { dateHeureConvocation, dateHeureDepart, evaluerReservation } from '../../src/lib/confirmation';
import { compteARebours, jourCourt, montant } from '../../src/lib/format';
import { prochainVoyage, useApp, voyagesEffectues } from '../../src/store/useApp';
import { couleurs, degrades, espace, rayon } from '../../src/theme';

export default function Accueil() {
  const router = useRouter();
  const voyageur = useApp((e) => e.voyageur);
  const reservations = useApp((e) => e.reservations);

  const prochain = useMemo(() => prochainVoyage(reservations), [reservations]);
  const effectues = useMemo(() => voyagesEffectues(reservations), [reservations]);

  const kilometres = useMemo(
    () =>
      effectues.reduce((total, r) => total + (ligneParId(r.ligneId)?.distanceKm ?? 0), 0),
    [effectues],
  );

  const villeFavorite = useMemo(() => {
    const compte = new Map<string, number>();
    effectues.forEach((r) => {
      const l = ligneParId(r.ligneId);
      if (l) compte.set(l.destination, (compte.get(l.destination) ?? 0) + 1);
    });
    return [...compte.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  }, [effectues]);

  const decision = prochain ? evaluerReservation(prochain) : null;
  const alerteConfirmation =
    prochain && (decision?.type === 'ALARME' || decision?.type === 'RAPPEL');

  return (
    <Ecran>
      <Animated.View entering={FadeIn.duration(500)} style={styles.entete}>
        <View style={{ flex: 1, gap: 6 }}>
          <LogoSaramaya hauteur={30} />
          <Txt v="petit" couleur={couleurs.texteFaible}>
            {format(new Date(), 'EEEE d MMMM', { locale: fr })}
          </Txt>
          <Txt v="titre">Bonjour {voyageur?.prenom ?? ''}</Txt>
        </View>
        {/*
          Le manifeste des départs est un outil de gare, pas un écran de voyageur.
          Dans l'application publique il n'existe pas — et le bouton non plus :
          `modeAgent.ts` promet qu'aucun bouton n'y renvoie, or celui-ci le faisait,
          pour retomber aussitôt sur l'accueil puisque l'écran est protégé. Un
          bouton qui ne fait rien est un bouton de trop.
        */}
        {MODE_AGENT ? (
          <Pressable
            onPress={() => router.push('/gare')}
            style={styles.boutonGare}
            accessibilityRole="button"
            accessibilityLabel="Manifeste des départs"
          >
            <Ionicons name="business-outline" size={18} color={couleurs.texteDoux} />
          </Pressable>
        ) : null}
      </Animated.View>

      <Animated.View entering={FadeIn.delay(150).duration(700)}>
        <Bus3D hauteur={200} />
      </Animated.View>

      {prochain ? (
        <CarteProchainVoyage reservation={prochain} alerte={Boolean(alerteConfirmation)} />
      ) : (
        <Carte>
          <Txt v="sousTitre">Aucun voyage prévu</Txt>
          <Txt v="petit" couleur={couleurs.texteFaible}>
            Réservez votre prochaine place en quelques gestes.
          </Txt>
          <Bouton titre="Réserver un voyage" onPress={() => router.push('/reserver')} />
        </Carte>
      )}

      <Section>Votre parcours</Section>
      <View style={styles.grilleStats}>
        <Stat valeur={String(effectues.length)} libelle="voyages" icone="bus" index={0} />
        <Stat valeur={`${kilometres}`} libelle="kilomètres" icone="map" index={1} />
        <Stat valeur={villeFavorite} libelle="destination" icone="location" index={2} petit />
      </View>

      <Section>Raccourcis</Section>
      <View style={{ gap: espace.md }}>
        <Raccourci
          icone="scan"
          titre="Scanner un ticket papier"
          detail="Ajoutez un ticket acheté au guichet"
          onPress={() => router.push('/reserver?scan=1')}
        />
        <Raccourci
          icone="cube"
          titre="Envoyer un colis"
          detail="Préparez l'envoi, déposez au guichet"
          onPress={() => router.push('/colis')}
        />
        <Raccourci
          icone="repeat"
          titre="Refaire un trajet"
          detail={
            effectues[0]
              ? `${ligneParId(effectues[0].ligneId)?.origine} → ${ligneParId(effectues[0].ligneId)?.destination}`
              : 'Depuis votre historique'
          }
          onPress={() => router.push('/voyages')}
        />
      </View>

      <Section>Lignes desservies</Section>
      {LIGNES.slice(0, 4).map((l, i) => (
        <Carte key={l.id} index={i} style={{ paddingVertical: espace.md }}>
          <View style={styles.rangeeLigne}>
            <View style={{ flex: 1 }}>
              <Txt v="corpsFort">
                {l.origine} → {l.destination}
              </Txt>
              <Txt v="petit" couleur={couleurs.texteFaible}>
                {l.departs.length} départs · {l.distanceKm} km
              </Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt v="corpsFort" couleur={couleurs.marqueVif}>
                {montant(l.tarifs.ORDINAIRE)}
              </Txt>
              <Txt v="minuscule" couleur={couleurs.vip}>
                VIP {montant(l.tarifs.VIP_1RE)}
              </Txt>
            </View>
          </View>
        </Carte>
      ))}
    </Ecran>
  );
}

function CarteProchainVoyage({
  reservation,
  alerte,
}: {
  reservation: ReturnType<typeof prochainVoyage>;
  alerte: boolean;
}) {
  const router = useRouter();
  if (!reservation) return null;
  const ligne = ligneParId(reservation.ligneId);
  const depart = dateHeureDepart(reservation);
  const convocation = dateHeureConvocation(reservation);

  return (
    <Animated.View entering={FadeInDown.delay(220).springify().damping(18)}>
      <Pressable onPress={() => router.push(`/billet/${reservation.id}`)}>
       <CarteSpatiale intensite={7} style={styles.enveloppeSpatiale}>
        <LinearGradient
          colors={['rgba(216,31,38,0.28)', 'rgba(142,16,23,0.10)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.carteVoyage}
        >
          <View style={styles.rangeeLigne}>
            <Txt v="section" couleur={couleurs.marqueVif}>
              PROCHAIN VOYAGE
            </Txt>
            <BadgeStatut statut={reservation.statut} />
          </View>

          <View style={styles.trajet}>
            <View style={{ flex: 1 }}>
              <Txt v="sousTitre">{ligne?.origine}</Txt>
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                DÉPART {reservation.heure}
              </Txt>
            </View>
            <View style={styles.fleche}>
              <View style={styles.pointille} />
              <Ionicons name="bus" size={16} color={couleurs.marqueVif} />
              <View style={styles.pointille} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Txt v="sousTitre">{ligne?.destination}</Txt>
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                {jourCourt(reservation.date).toUpperCase()}
              </Txt>
            </View>
          </View>

          <Trait />

          <View style={styles.rangeeLigne}>
            <View>
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                CONVOCATION
              </Txt>
              <Txt v="corpsFort">{reservation.convocation}</Txt>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                SIÈGE
              </Txt>
              <Txt v="corpsFort">{reservation.siege ?? '—'}</Txt>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                CLASSE
              </Txt>
              <BadgeClasse classe={reservation.classe} petit />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt v="minuscule" couleur={couleurs.texteFaible}>
                DÉPART
              </Txt>
              <Txt v="corpsFort" couleur={couleurs.marqueVif}>
                {compteARebours(depart)}
              </Txt>
            </View>
          </View>

          {alerte ? (
            <Pressable
              onPress={() => router.push(`/confirmation/${reservation.id}`)}
              style={styles.bandeauAlerte}
            >
              <Ionicons name="alarm" size={18} color={couleurs.attention} />
              <View style={{ flex: 1 }}>
                <Txt v="petit" couleur={couleurs.attention}>
                  Confirmation attendue
                </Txt>
                <Txt v="minuscule" couleur={couleurs.texteFaible}>
                  Répondez avant {format(convocation, 'HH:mm')} pour garder votre place
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={16} color={couleurs.attention} />
            </Pressable>
          ) : null}
        </LinearGradient>
       </CarteSpatiale>
      </Pressable>
    </Animated.View>
  );
}

function Stat({
  valeur,
  libelle,
  icone,
  index,
  petit = false,
}: {
  valeur: string;
  libelle: string;
  icone: keyof typeof Ionicons.glyphMap;
  index: number;
  petit?: boolean;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(300 + index * 90).springify().damping(18)}
      style={styles.stat}
    >
      <Ionicons name={icone} size={16} color={couleurs.marqueVif} />
      <Txt v={petit ? 'corpsFort' : 'chiffres'} style={petit ? { marginTop: 6 } : undefined} numberOfLines={1}>
        {valeur}
      </Txt>
      <Txt v="minuscule" couleur={couleurs.texteFaible}>
        {libelle.toUpperCase()}
      </Txt>
    </Animated.View>
  );
}

function Raccourci({
  icone,
  titre,
  detail,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titre: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.raccourci}>
      <LinearGradient colors={degrades.chaleur} style={styles.iconeRaccourci}>
        <Ionicons name={icone} size={18} color="#fff" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Txt v="corpsFort">{titre}</Txt>
        <Txt v="petit" couleur={couleurs.texteFaible}>
          {detail}
        </Txt>
      </View>
      <Ionicons name="chevron-forward" size={18} color={couleurs.texteFaible} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  entete: { flexDirection: 'row', alignItems: 'center', gap: espace.md },
  boutonGare: {
    width: 40,
    height: 40,
    borderRadius: rayon.rond,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.surfaceHaute,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  enveloppeSpatiale: { borderRadius: rayon.xl, overflow: 'hidden' },
  carteVoyage: {
    borderRadius: rayon.xl,
    borderWidth: 1,
    borderColor: 'rgba(240,53,127,0.35)',
    padding: espace.lg,
    gap: espace.md,
  },
  trajet: { flexDirection: 'row', alignItems: 'center', gap: espace.sm },
  fleche: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' },
  pointille: { flex: 1, height: 1, backgroundColor: 'rgba(240,53,127,0.4)' },
  rangeeLigne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bandeauAlerte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.sm,
    backgroundColor: 'rgba(245,165,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,165,36,0.35)',
    borderRadius: rayon.md,
    padding: espace.md,
  },
  grilleStats: { flexDirection: 'row', gap: espace.md },
  stat: {
    flex: 1,
    backgroundColor: couleurs.surface,
    borderRadius: rayon.lg,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espace.md,
    gap: 2,
  },
  raccourci: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.md,
    backgroundColor: couleurs.surface,
    borderRadius: rayon.lg,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espace.md,
  },
  iconeRaccourci: {
    width: 40,
    height: 40,
    borderRadius: rayon.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * Écran de confirmation — ce qui remplace l'appel téléphonique de la gare.
 *
 * Trois usages, selon le paramètre `action` :
 *   (aucun)   l'alarme : « je viens » ou « j'annule »
 *   annuler   l'annulation, qui propose d'abord le report
 *   reporter  le choix d'un autre départ dans la validité de 30 jours
 *
 * Rien ici ne peut faire perdre une place par accident : l'annulation demande une
 * seconde confirmation, et un billet payé n'est jamais annulé par un minuteur.
 */

import { Ionicons } from '@expo/vector-icons';
import { addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  BadgeClasse,
  Bouton,
  Carte,
  Ecran,
  MessageErreur,
  Section,
  Trait,
  Txt,
} from '../../src/components/base';
import { ligneParId } from '../../src/data/reseau';
import { useAction } from '../../src/lib/action';
import { politiqueAnnulation } from '../../src/lib/annulation';
import { dateHeureConvocation, estProtegee } from '../../src/lib/confirmation';
import { compteARebours, montant } from '../../src/lib/format';
import { useApp } from '../../src/store/useApp';
import { couleurs, degrades, espace, rayon } from '../../src/theme';

export default function Confirmation() {
  const { id, action } = useLocalSearchParams<{ id: string; action?: string }>();
  const router = useRouter();
  const reservations = useApp((e) => e.reservations);
  const r = reservations.find((x) => x.id === id);

  if (!r) {
    return (
      <Ecran>
        <Txt v="titre">Réservation introuvable</Txt>
        <Bouton titre="Retour" variante="secondaire" onPress={() => router.back()} />
      </Ecran>
    );
  }

  if (action === 'annuler') return <Annulation reservationId={r.id} />;
  if (action === 'reporter') return <Report reservationId={r.id} />;
  return <Alarme reservationId={r.id} />;
}

/* ── L'alarme ──────────────────────────────────────────────────────────────── */

function Alarme({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const reservations = useApp((e) => e.reservations);
  const confirmer = useApp((e) => e.confirmer);
  const r = reservations.find((x) => x.id === reservationId)!;
  const ligne = ligneParId(r.ligneId);

  const pulsation = useSharedValue(1);
  const lueur = useSharedValue(0.4);

  useEffect(() => {
    pulsation.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 700, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 700, easing: Easing.in(Easing.quad) }),
      ),
      -1,
    );
    lueur.value = withRepeat(
      withSequence(withTiming(0.85, { duration: 700 }), withTiming(0.35, { duration: 700 })),
      -1,
    );
  }, [pulsation, lueur]);

  const animCercle = useAnimatedStyle(() => ({ transform: [{ scale: pulsation.value }] }));
  const animLueur = useAnimatedStyle(() => ({ opacity: lueur.value }));

  const reponse = useAction(async () => {
    await confirmer(r.id);
    router.replace(`/billet/${r.id}`);
  }, "Votre réponse n'a pas pu être enregistrée. Réessayez, ou appelez la gare.");

  return (
    <Ecran defilant={false}>
      <View style={styles.pleinEcran}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.zoneAlarme}>
          <Animated.View style={[styles.lueur, animLueur]} />
          <Animated.View style={animCercle}>
            <LinearGradient colors={degrades.chaleur} style={styles.rondAlarme}>
              <Ionicons name="alarm" size={44} color="#fff" />
            </LinearGradient>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150)} style={{ alignItems: 'center', gap: espace.sm }}>
          <Txt v="titre" style={{ textAlign: 'center', fontSize: 26 }}>
            Confirmez votre voyage
          </Txt>
          <Txt v="corps" couleur={couleurs.texteDoux} style={{ textAlign: 'center' }}>
            {ligne?.origine} → {ligne?.destination}
          </Txt>
          <View style={styles.rappelHoraire}>
            <Txt v="corpsFort" couleur={couleurs.marqueVif}>
              Départ {r.heure}
            </Txt>
            <Txt v="petit" couleur={couleurs.texteFaible}>
              · convocation {r.convocation} ·
            </Txt>
            <Txt v="corpsFort" couleur={couleurs.attention}>
              {compteARebours(dateHeureConvocation(r))}
            </Txt>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={{ width: '100%', gap: espace.md }}>
          <MessageErreur texte={reponse.erreur} />
          <Bouton
            titre={reponse.enCours ? 'Enregistrement…' : 'Oui, je viens'}
            sousTitre="Votre place est gardée"
            variante="succes"
            desactive={reponse.enCours}
            onPress={reponse.lancer}
          />
          <Bouton
            titre="Je ne peux pas venir"
            variante="secondaire"
            onPress={() => router.replace(`/confirmation/${r.id}?action=annuler`)}
          />
        </Animated.View>

        {/* La promesse faite au voyageur, écrite noir sur blanc. */}
        <Animated.View entering={FadeIn.delay(500)}>
          <Carte style={{ borderColor: estProtegee(r) ? 'rgba(46,204,143,0.35)' : couleurs.bordure }}>
            <View style={{ flexDirection: 'row', gap: espace.sm }}>
              <Ionicons
                name={estProtegee(r) ? 'shield-checkmark' : 'information-circle'}
                size={18}
                color={estProtegee(r) ? couleurs.succes : couleurs.attention}
              />
              <Txt v="petit" couleur={couleurs.texteDoux} style={{ flex: 1 }}>
                {estProtegee(r)
                  ? "Votre billet est payé : aucune absence de réponse ne peut l'annuler. Sans réponse, un agent de la gare vous appellera."
                  : "Cette réservation n'est pas encore payée. Sans réponse à la convocation, la place sera signalée à la gare — c'est un agent qui décidera, jamais l'application."}
              </Txt>
            </View>
          </Carte>
        </Animated.View>

        <Pressable onPress={() => router.back()}>
          <Txt v="petit" couleur={couleurs.texteFaible}>
            Me le redemander plus tard
          </Txt>
        </Pressable>
      </View>
    </Ecran>
  );
}

/* ── L'annulation, qui commence par proposer le report ─────────────────────── */

function Annulation({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const reservations = useApp((e) => e.reservations);
  const annuler = useApp((e) => e.annuler);
  const r = reservations.find((x) => x.id === reservationId)!;
  const ligne = ligneParId(r.ligneId);
  const politique = politiqueAnnulation(r);
  const [confirmationDemandee, setConfirmationDemandee] = useState(false);

  /*
   * L'annulation est irréversible aux yeux du voyageur : si elle échoue en
   * silence, il croit sa place libérée alors qu'elle est toujours retenue — ou
   * l'inverse. Elle doit dire ce qui s'est passé.
   */
  const annulation = useAction(async () => {
    await annuler(r.id);
    router.replace(`/billet/${r.id}`);
  }, "L'annulation n'a pas pu être enregistrée. Votre place est toujours retenue — réessayez.");

  return (
    <Ecran>
      <View style={styles.entre}>
        <Pressable onPress={() => router.back()} style={styles.retour}>
          <Ionicons name="chevron-back" size={22} color={couleurs.texte} />
        </Pressable>
      </View>

      <Txt v="titre">Vous ne pouvez pas voyager ?</Txt>
      <Txt v="corps" couleur={couleurs.texteDoux}>
        Votre ticket reste valable 30 jours. Dans la plupart des cas, mieux vaut le reporter
        que l'annuler — vous ne perdez rien, et il n'y a aucune démarche en caisse.
      </Txt>

      <Carte surbrillance>
        <Txt v="minuscule" couleur={couleurs.texteFaible}>
          VOTRE VOYAGE
        </Txt>
        <Txt v="sousTitre">
          {ligne?.origine} → {ligne?.destination}
        </Txt>
        <Txt v="petit" couleur={couleurs.texteFaible}>
          {format(new Date(`${r.date}T${r.heure}:00`), 'EEEE d MMMM à HH:mm', { locale: fr })} ·{' '}
          {montant(r.montant)}
        </Txt>
      </Carte>

      <Section>Solution recommandée</Section>
      <Bouton
        titre="Reporter mon voyage"
        sousTitre={`Gratuit, sur un autre départ avant le ${format(new Date(r.expireLe), 'd MMMM', { locale: fr })}`}
        variante="succes"
        desactive={!politique.peutReporter}
        onPress={() => router.replace(`/confirmation/${r.id}?action=reporter`)}
      />

      <Section>Ou bien</Section>
      <Carte>
        <View style={{ flexDirection: 'row', gap: espace.sm }}>
          <Ionicons name="cash-outline" size={18} color={couleurs.texteFaible} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt v="corpsFort">
              {politique.remboursement === 'AUCUN'
                ? 'Aucun remboursement'
                : politique.remboursement === 'INTEGRAL'
                  ? `Remboursement de ${montant(politique.montantRembourse)}`
                  : `Remboursement partiel de ${montant(politique.montantRembourse)}`}
            </Txt>
            <Txt v="petit" couleur={couleurs.texteFaible}>
              {politique.motif}
            </Txt>
            {politique.actionAgentRequise ? (
              <Txt v="minuscule" couleur={couleurs.attention}>
                À RETIRER AU GUICHET
              </Txt>
            ) : null}
          </View>
        </View>
      </Carte>

      {!confirmationDemandee ? (
        <Bouton
          titre="Annuler quand même"
          variante="danger"
          onPress={() => setConfirmationDemandee(true)}
        />
      ) : (
        <Animated.View entering={FadeInDown} style={{ gap: espace.md }}>
          <Carte style={{ borderColor: 'rgba(242,84,91,0.45)' }}>
            <Txt v="corpsFort" couleur={couleurs.danger}>
              Confirmer l'annulation ?
            </Txt>
            <Txt v="petit" couleur={couleurs.texteDoux}>
              Votre place sera proposée à la liste d'attente. Vous pourrez revenir en arrière
              pendant 15 minutes, tant qu'elle n'a pas été réattribuée.
            </Txt>
          </Carte>
          <MessageErreur texte={annulation.erreur} />
          <Bouton
            titre={annulation.enCours ? 'Annulation…' : 'Oui, annuler définitivement'}
            variante="danger"
            desactive={annulation.enCours}
            onPress={annulation.lancer}
          />
          <Bouton
            titre="Non, garder ma place"
            variante="secondaire"
            onPress={() => setConfirmationDemandee(false)}
          />
        </Animated.View>
      )}
    </Ecran>
  );
}

/* ── Le report ─────────────────────────────────────────────────────────────── */

function Report({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const reservations = useApp((e) => e.reservations);
  const reporter = useApp((e) => e.reporter);
  const r = reservations.find((x) => x.id === reservationId)!;
  const ligne = ligneParId(r.ligneId);
  const [date, setDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));

  const report = useAction(async (heure: string) => {
    await reporter(r.id, { date, heure });
    router.replace(`/billet/${r.id}`);
  }, "Le report n'a pas pu être enregistré. Votre départ initial reste valable — réessayez.");

  return (
    <Ecran>
      <View style={styles.entre}>
        <Pressable onPress={() => router.back()} style={styles.retour}>
          <Ionicons name="chevron-back" size={22} color={couleurs.texte} />
        </Pressable>
      </View>

      <Txt v="titre">Reporter le voyage</Txt>
      <Txt v="corps" couleur={couleurs.texteDoux}>
        Choisissez un nouveau départ. Votre billet {montant(r.montant)} est conservé, aucun
        paiement supplémentaire n'est demandé.
      </Txt>

      <Section>Nouveau jour</Section>
      <View style={styles.jours}>
        {Array.from({ length: 8 }, (_, i) => addDays(new Date(), i + 1)).map((d) => {
          const iso = format(d, 'yyyy-MM-dd');
          const actif = iso === date;
          return (
            <Pressable key={iso} onPress={() => setDate(iso)}>
              <View style={[styles.jour, actif && styles.jourActif]}>
                <Txt v="minuscule" couleur={actif ? '#fff' : couleurs.texteFaible}>
                  {format(d, 'EEE', { locale: fr }).toUpperCase()}
                </Txt>
                <Txt v="corpsFort" couleur={actif ? '#fff' : couleurs.texte}>
                  {format(d, 'd')}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Section>Nouveau départ</Section>
      <MessageErreur texte={report.erreur} />
      {(ligne?.departs ?? []).map((d) => (
        <Pressable key={d.heure} disabled={report.enCours} onPress={() => report.lancer(d.heure)}>
          <Carte style={{ paddingVertical: espace.md, opacity: report.enCours ? 0.5 : 1 }}>
            <View style={styles.entre}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.md }}>
                <Txt v="sousTitre">{d.heure}</Txt>
                <BadgeClasse classe={d.classe} petit />
              </View>
              <Ionicons name="chevron-forward" size={18} color={couleurs.texteFaible} />
            </View>
          </Carte>
        </Pressable>
      ))}

      <Trait />
      <Txt v="petit" couleur={couleurs.texteFaible}>
        Le report ne coûte rien à la compagnie : aucune somme ne sort de la caisse, et la
        place libérée repart immédiatement à la vente.
      </Txt>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  pleinEcran: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espace.xl,
    paddingVertical: espace.xxxl,
  },
  zoneAlarme: { alignItems: 'center', justifyContent: 'center', height: 160 },
  lueur: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(240,78,55,0.28)',
  },
  rondAlarme: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rappelHoraire: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
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
  jours: { flexDirection: 'row', flexWrap: 'wrap', gap: espace.sm },
  jour: {
    width: 56,
    alignItems: 'center',
    paddingVertical: espace.md,
    borderRadius: rayon.md,
    backgroundColor: couleurs.surface,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  jourActif: { backgroundColor: couleurs.marqueProfond, borderColor: couleurs.marqueVif },
});

/**
 * Rappels et alarme — la vraie programmation des notifications locales.
 *
 * Chaque réservation à venir déclenche une escalade de rappels planifiés à l'heure
 * exacte, plus une alerte d'expiration. Tout est local à l'appareil (aucun serveur),
 * et rien n'est simulé : les notifications sont réellement remises au système, qui
 * les affiche même application fermée.
 *
 * Sur le web, l'API de notifications programmées n'est pas fiable : les fonctions
 * deviennent silencieuses plutôt que d'échouer.
 */

import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { addDays } from 'date-fns';
import { ECHELLE_RAPPELS, dateHeureDepart } from './confirmation';
import { ligneParId } from '../data/reseau';
import { joursAvantExpiration } from './format';
import type { Reservation } from '../types';

const web = Platform.OS === 'web';

/** À appeler une fois au démarrage : canal Android et présentation au premier plan. */
export async function initialiserNotifications() {
  if (web) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    // Canal dédié à l'alarme : priorité maximale, vibration marquée.
    await Notifications.setNotificationChannelAsync('alarme', {
      name: 'Alarme de confirmation',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400, 200, 400],
      sound: 'default',
      bypassDnd: false,
    });
    await Notifications.setNotificationChannelAsync('rappels', {
      name: 'Rappels de voyage',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      sound: 'default',
    });
  }
}

/** Demande l'autorisation d'envoyer des notifications. Renvoie vrai si accordée. */
export async function demanderAutorisation(): Promise<boolean> {
  if (web) return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const demande = await Notifications.requestPermissionsAsync();
  return demande.status === 'granted';
}

/**
 * Programme tous les rappels d'une réservation : l'escalade de confirmation, puis
 * les alertes d'expiration à J-7 et J-2. Les rappels déjà passés sont ignorés.
 *
 * Renvoie les identifiants des notifications programmées, pour pouvoir les annuler
 * si la réservation change.
 */
export async function programmerRappels(r: Reservation): Promise<string[]> {
  if (web) return [];
  if (!(await demanderAutorisation())) return [];

  const ligne = ligneParId(r.ligneId);
  const trajet = ligne ? `${ligne.origine} → ${ligne.destination}` : 'Votre voyage';
  const depart = dateHeureDepart(r);
  const maintenant = Date.now();
  const ids: string[] = [];

  for (const etape of ECHELLE_RAPPELS) {
    const quand = new Date(depart.getTime() - etape.minutesAvant * 60000);
    if (quand.getTime() <= maintenant) continue;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title:
          etape.canal === 'ALARME'
            ? `⏰ ${trajet}`
            : etape.intensite === 'MAXIMALE'
              ? `Dernier appel — ${trajet}`
              : trajet,
        body: etape.message({ ligne: trajet, heure: r.heure, convocation: r.convocation }),
        data: { reservationId: r.id, type: 'confirmation' },
        sound: 'default',
        ...(Platform.OS === 'android'
          ? { channelId: etape.canal === 'ALARME' ? 'alarme' : 'rappels' }
          : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: quand,
      },
    });
    ids.push(id);
  }

  // Alertes d'expiration du billet (validité 30 jours).
  for (const jAvant of [7, 2]) {
    const quand = addDays(new Date(r.expireLe), -jAvant);
    if (quand.getTime() <= maintenant) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Billet ${trajet}`,
        body:
          jAvant === 2
            ? `Votre billet expire dans 2 jours. Utilisez-le ou reportez-le.`
            : `Votre billet expire dans une semaine.`,
        data: { reservationId: r.id, type: 'expiration' },
        ...(Platform.OS === 'android' ? { channelId: 'rappels' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: quand,
      },
    });
    ids.push(id);
  }

  return ids;
}

/**
 * Rappels avant l'expiration de la pièce d'identité.
 *
 * Une CNIB périmée ne gêne pas seulement à l'entrée de la gare : elle transforme un
 * contrôle routier de routine en mauvaise soirée. On prévient donc à un mois, à une
 * semaine, puis la veille — assez tôt pour faire renouveler, assez près pour ne pas
 * oublier.
 *
 * Tout se joue sur l'appareil : la date reste sur le téléphone, la notification est
 * locale, rien n'est transmis. Et ce service est annoncé au voyageur, jamais caché.
 */
export async function programmerRappelsCnib(dateExpiration: string): Promise<string[]> {
  if (web) return [];
  await demanderAutorisation();

  const ids: string[] = [];
  const expiration = new Date(`${dateExpiration}T09:00:00`);
  const maintenant = Date.now();

  const etapes: { jAvant: number; corps: string }[] = [
    { jAvant: 30, corps: 'Votre CNIB expire dans un mois. Pensez à la faire renouveler.' },
    { jAvant: 7, corps: 'Votre CNIB expire dans une semaine.' },
    { jAvant: 1, corps: 'Votre CNIB expire demain — évitez un souci au prochain contrôle.' },
  ];

  for (const etape of etapes) {
    const quand = addDays(expiration, -etape.jAvant);
    if (quand.getTime() <= maintenant) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Pièce d'identité",
        body: etape.corps,
        data: { type: 'cnib' },
        ...(Platform.OS === 'android' ? { channelId: 'rappels' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: quand,
      },
    });
    ids.push(id);
  }
  return ids;
}

/** Annule des notifications programmées (par exemple après annulation ou report). */
export async function annulerRappels(ids: string[]) {
  if (web) return;
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

/** Notification immédiate — utilisée pour accuser réception d'une action. */
export async function notifierMaintenant(titre: string, corps: string) {
  if (web) return;
  if (!(await demanderAutorisation())) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: titre, body: corps, sound: 'default' },
    trigger: null,
  });
}

/** Combien de jours avant expiration, pour l'affichage. */
export function joursRestants(r: Reservation): number {
  return joursAvantExpiration(r.expireLe);
}

/* ── L'état réel des rappels, tel qu'il doit s'afficher ──────────────────── */

export type EtatNotifications = 'INCONNU' | 'ACCORDEES' | 'REFUSEES' | 'INDISPONIBLE';

/**
 * L'autorisation de notifier, telle que le système la voit.
 *
 * L'écran Profil affichait quatre interrupteurs toujours allumés, qui ne
 * commandaient rien : un décor. Or un rappel dépend d'une autorisation que le
 * voyageur peut refuser, ou retirer plus tard dans les réglages du téléphone —
 * auquel cas **plus aucun rappel ne part**, et l'application continuait de montrer
 * tout en vert.
 *
 * L'état est relu au retour au premier plan : c'est précisément le moment où l'on
 * revient des réglages du système après avoir changé d'avis.
 */
export function useEtatNotifications(): {
  etat: EtatNotifications;
  demander: () => Promise<void>;
} {
  const [etat, setEtat] = useState<EtatNotifications>(web ? 'INDISPONIBLE' : 'INCONNU');

  const relire = useCallback(async () => {
    if (web) return;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setEtat(status === 'granted' ? 'ACCORDEES' : 'REFUSEES');
    } catch {
      setEtat('INDISPONIBLE');
    }
  }, []);

  useEffect(() => {
    relire();
    const abonnement = AppState.addEventListener('change', (e) => {
      if (e === 'active') relire();
    });
    return () => abonnement.remove();
  }, [relire]);

  const demander = useCallback(async () => {
    await demanderAutorisation();
    await relire();
  }, [relire]);

  return { etat, demander };
}

/**
 * Les rappels réellement programmés par l'application, dans l'ordre où ils
 * arrivent. Cette liste est la description de ce que fait `programmerRappels` et
 * `programmerRappelsCnib` — elle n'annonce rien d'autre.
 */
export const RAPPELS_ANNONCES: { titre: string; detail: string }[] = [
  { titre: 'Rappels avant le départ', detail: "Jusqu'à l'heure de convocation, 30 minutes avant" },
  { titre: 'Expiration du billet', detail: 'À 7 jours puis à 2 jours de la fin des 30 jours' },
  { titre: "Expiration de la CNIB", detail: 'Un mois, une semaine, puis la veille — si la date est renseignée' },
];

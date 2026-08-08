/**
 * Moteur de confirmation.
 *
 * Il remplace les appels téléphoniques que la gare passe aujourd'hui à chaque
 * passager avant la convocation, et il obéit à une règle non négociable :
 *
 *      LE SILENCE NE DÉTRUIT JAMAIS QUELQUE CHOSE DE PAYÉ.
 *
 * Une réservation non payée n'est qu'une option : la laisser expirer est légitime,
 * c'est déjà la règle de la compagnie. Un billet payé, lui, n'est jamais annulé par
 * un minuteur — seul un agent qui voit le bus décide, à 5 minutes du départ.
 *
 * Au bout de l'escalade, l'échéance ne produit donc pas une annulation mais un
 * signalement : la place bascule en « sans réponse » sur l'écran de la gare, et
 * l'agent tranche.
 */

import { addMinutes, differenceInMinutes, parseISO } from 'date-fns';
import { MINUTES_CONVOCATION, MINUTES_LIBERATION_PLACE } from '../data/reseau';
import type {
  DecisionConfirmation,
  EtapeRappel,
  Reservation,
  StatutReservation,
} from '../types';

/** États sur lesquels plus aucun rappel n'a de sens. */
const ETATS_TERMINAUX: StatutReservation[] = [
  'ANNULEE',
  'REPORTEE',
  'EMBARQUE',
  'NO_SHOW',
];

/** États qu'aucun minuteur ne peut annuler. */
const ETATS_PROTEGES: StatutReservation[] = ['PAYEE', 'CONFIRMEE'];

/** Fenêtre pendant laquelle une annulation reste rattrapable. */
export const MINUTES_RETRACTATION = 15;

/**
 * L'escalade, du plus doux au plus insistant. Chaque étape est franchie une seule
 * fois : dès que le voyageur répond, tout s'arrête.
 */
export const ECHELLE_RAPPELS: EtapeRappel[] = [
  {
    id: 'veille',
    libelle: 'Rappel de la veille',
    minutesAvant: 24 * 60,
    canal: 'PUSH',
    intensite: 'DOUCE',
    message: ({ ligne, heure }) =>
      `Votre voyage ${ligne} part demain à ${heure}. Confirmez-vous votre place ?`,
  },
  {
    id: 'trois-heures',
    libelle: 'Rappel de la matinée',
    minutesAvant: 180,
    canal: 'PUSH',
    intensite: 'NORMALE',
    message: ({ ligne, convocation }) =>
      `${ligne} dans 3 heures. Présentez-vous à ${convocation} à la gare.`,
  },
  {
    id: 'quatre-vingt-dix',
    libelle: 'Rappel insistant',
    minutesAvant: 90,
    canal: 'PUSH_ET_SMS',
    intensite: 'INSISTANTE',
    message: ({ heure }) =>
      `Départ à ${heure}. Merci de confirmer votre présence pour garder votre place.`,
  },
  {
    id: 'alarme',
    libelle: 'Alarme de confirmation',
    minutesAvant: 60,
    canal: 'ALARME',
    intensite: 'MAXIMALE',
    message: ({ heure, convocation }) =>
      `Départ à ${heure}, convocation à ${convocation}. Je viens, ou j'annule ?`,
  },
  {
    id: 'dernier-appel',
    libelle: 'Dernier appel',
    minutesAvant: 45,
    canal: 'PUSH_ET_SMS',
    intensite: 'MAXIMALE',
    message: ({ convocation }) =>
      `Dernier appel. Sans réponse à ${convocation}, votre place sera proposée à la liste d'attente.`,
  },
];

export function dateHeureDepart(r: Reservation): Date {
  return parseISO(`${r.date}T${r.heure}:00`);
}

export function dateHeureConvocation(r: Reservation): Date {
  return addMinutes(dateHeureDepart(r), -MINUTES_CONVOCATION);
}

/** Vrai si aucun minuteur ne peut toucher à cette réservation. */
export function estProtegee(r: Reservation): boolean {
  return ETATS_PROTEGES.includes(r.statut);
}

/** Le voyageur a-t-il déjà répondu ? */
export function aRepondu(r: Reservation): boolean {
  return Boolean(r.confirmeLe) || r.statut === 'CONFIRMEE' || r.statut === 'ANNULEE';
}

/**
 * Étape de rappel due à cet instant : la plus insistante dont le seuil est franchi
 * et qui n'a pas encore été jouée.
 */
function etapeDue(minutesRestantes: number, dejaJouees: string[]): EtapeRappel | null {
  const candidates = ECHELLE_RAPPELS.filter(
    (e) => minutesRestantes <= e.minutesAvant && !dejaJouees.includes(e.id),
  );
  if (candidates.length === 0) return null;
  // La plus proche du départ l'emporte : inutile de rejouer les rappels doux.
  return candidates.reduce((a, b) => (a.minutesAvant < b.minutesAvant ? a : b));
}

/**
 * Que faire, maintenant, pour cette réservation ?
 *
 * Cette fonction ne modifie rien : elle rend une décision, que l'appelant applique.
 */
export function evaluerReservation(
  r: Reservation,
  maintenant: Date = new Date(),
  rappelsDejaJoues: string[] = [],
): DecisionConfirmation {
  if (ETATS_TERMINAUX.includes(r.statut)) {
    return { type: 'RIEN_A_FAIRE', motif: 'Réservation close.' };
  }

  const depart = dateHeureDepart(r);
  const minutesRestantes = differenceInMinutes(depart, maintenant);

  if (minutesRestantes < 0) {
    return { type: 'RIEN_A_FAIRE', motif: 'Le départ a déjà eu lieu.' };
  }

  // L'échéance : la convocation, 30 minutes avant le départ.
  if (minutesRestantes <= MINUTES_CONVOCATION) {
    if (estProtegee(r)) {
      return {
        type: 'PROTEGEE',
        motif:
          r.statut === 'CONFIRMEE'
            ? 'Le voyageur a confirmé sa venue : la place lui reste acquise.'
            : `Billet payé : aucun minuteur ne peut l'annuler. Seul un agent peut libérer la place, ${MINUTES_LIBERATION_PLACE} minutes avant le départ.`,
      };
    }
    return {
      type: 'SIGNALER_A_LA_GARE',
      motif:
        "Option non payée et sans réponse à la convocation. La place est signalée à la gare — c'est l'agent qui décide, pas l'application.",
    };
  }

  // Le voyageur a répondu : on ne le harcèle pas.
  if (aRepondu(r)) {
    return { type: 'RIEN_A_FAIRE', motif: 'Le voyageur a déjà répondu.' };
  }

  const etape = etapeDue(minutesRestantes, rappelsDejaJoues);
  if (!etape) {
    return { type: 'RIEN_A_FAIRE', motif: 'Aucune étape due pour le moment.' };
  }

  return etape.canal === 'ALARME'
    ? { type: 'ALARME', etape }
    : { type: 'RAPPEL', etape };
}

/** Horaires absolus de chaque rappel, pour programmer les notifications locales. */
export function planifierRappels(r: Reservation): Array<{ etape: EtapeRappel; quand: Date }> {
  const depart = dateHeureDepart(r);
  return ECHELLE_RAPPELS.map((etape) => ({
    etape,
    quand: addMinutes(depart, -etape.minutesAvant),
  })).filter(({ quand }) => quand.getTime() > Date.now());
}

/**
 * Une annulation reste rattrapable tant que la place n'a pas été réattribuée.
 * C'est le garde-fou contre le geste malheureux.
 */
export function retractationPossible(
  r: Reservation,
  maintenant: Date = new Date(),
  placeReattribuee = false,
): boolean {
  if (r.statut !== 'ANNULEE' || !r.annuleLe) return false;
  if (placeReattribuee) return false;
  return differenceInMinutes(maintenant, parseISO(r.annuleLe)) <= MINUTES_RETRACTATION;
}

/**
 * Une réponse tardive reste recevable : tant que la place n'a pas été cédée,
 * « je viens » remet la réservation en vert, même après l'échéance.
 */
export function confirmationTardiveRecevable(
  r: Reservation,
  maintenant: Date = new Date(),
  placeReattribuee = false,
): boolean {
  if (placeReattribuee) return false;
  if (ETATS_TERMINAUX.includes(r.statut)) return false;
  const minutesRestantes = differenceInMinutes(dateHeureDepart(r), maintenant);
  return minutesRestantes >= MINUTES_LIBERATION_PLACE;
}

/**
 * Un push non délivré ne doit jamais être confondu avec un refus. Dans ce cas
 * seulement, l'agent décroche son téléphone — pour deux ou trois personnes, plus
 * pour tout le bus.
 */
export function appelAgentNecessaire(
  r: Reservation,
  notificationDelivree: boolean,
  maintenant: Date = new Date(),
): boolean {
  if (aRepondu(r) || estProtegee(r)) return false;
  const minutesRestantes = differenceInMinutes(dateHeureDepart(r), maintenant);
  return !notificationDelivree && minutesRestantes <= 90;
}

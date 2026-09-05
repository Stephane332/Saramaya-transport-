/**
 * Ce que l'application sait d'un habitué — calculé sur son téléphone.
 *
 * Un client qui prend le même car depuis des années n'a aucune raison de tout
 * redire à chaque fois. L'application peut lui proposer son trajet habituel, sa
 * gare, sa place, et lui montrer ce qu'il a parcouru. C'est la fidélisation
 * demandée — et elle ne coûte pas une base de données.
 *
 * **Tout se calcule ici, sur l'appareil, à partir de son propre historique.** Rien
 * n'est transmis, rien n'est profilé ailleurs. C'est exactement ce qui permet de
 * dire à la compagnie que nous ne détenons pas les habitudes de leurs clients : ces
 * chiffres n'existent que dans le téléphone qui les affiche.
 *
 * Ne comptent que les voyages **réellement effectués** — pas les réservations en
 * cours, pas les annulations. Un compteur qui gonfle sur des intentions ne veut rien
 * dire, et un habitué s'en apercevrait.
 */

import { ligneParId } from '../data/reseau';
import type { Reservation } from '../types';

export interface Fidelite {
  /** Voyages effectivement réalisés. */
  voyages: number;
  /** Total réellement dépensé, en francs CFA. */
  totalDepense: number;
  /** Kilomètres parcourus, d'après les distances réelles des lignes. */
  kilometres: number;
  /** Ligne la plus empruntée, s'il en émerge une. */
  ligneHabituelle: string | null;
  /** Gare de départ la plus fréquente. */
  gareHabituelle: string | null;
  /** Siège le plus souvent occupé — de quoi le proposer d'emblée. */
  siegePrefere: number | null;
  /** Classe la plus choisie. */
  classeHabituelle: Reservation['classe'] | null;
  /** Date du dernier voyage effectué, AAAA-MM-JJ. */
  dernierVoyage: string | null;
}

/** Valeur la plus fréquente d'une liste, ou null si la liste est vide. */
function plusFrequent<T extends string | number>(valeurs: T[]): T | null {
  if (valeurs.length === 0) return null;
  const comptes = new Map<T, number>();
  for (const v of valeurs) comptes.set(v, (comptes.get(v) ?? 0) + 1);

  let meilleure: T | null = null;
  let record = 0;
  for (const [valeur, compte] of comptes) {
    if (compte > record) {
      record = compte;
      meilleure = valeur;
    }
  }
  return meilleure;
}

export function calculerFidelite(reservations: Reservation[]): Fidelite {
  // Seuls les voyages faits comptent. Une réservation annulée ou en attente n'est
  // pas un voyage, et l'afficher comme tel serait mentir au client sur lui-même.
  const effectues = reservations.filter((r) => r.statut === 'EMBARQUE');

  const kilometres = effectues.reduce(
    (total, r) => total + (ligneParId(r.ligneId)?.distanceKm ?? 0),
    0,
  );

  const dates = effectues.map((r) => r.date).sort();

  return {
    voyages: effectues.length,
    totalDepense: effectues.reduce((total, r) => total + r.montant, 0),
    kilometres,
    ligneHabituelle: plusFrequent(effectues.map((r) => r.ligneId)),
    gareHabituelle: plusFrequent(effectues.map((r) => r.gareDepartId).filter(Boolean)),
    siegePrefere: plusFrequent(
      effectues.map((r) => r.siege).filter((s): s is number => s !== null),
    ),
    classeHabituelle: plusFrequent(effectues.map((r) => r.classe)),
    dernierVoyage: dates.length > 0 ? (dates[dates.length - 1] ?? null) : null,
  };
}

/**
 * Phrase de reconnaissance, affichée à l'habitué.
 *
 * Elle n'apparaît qu'à partir de trois voyages : avant, elle sonnerait faux — on ne
 * dit pas « votre trajet habituel » à quelqu'un qui est venu une fois.
 */
export function phraseHabitue(f: Fidelite): string | null {
  if (f.voyages < 3 || !f.ligneHabituelle) return null;
  const ligne = ligneParId(f.ligneHabituelle);
  if (!ligne) return null;
  return `${f.voyages} voyages avec Saramaya · ${ligne.origine} → ${ligne.destination}`;
}

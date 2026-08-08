/**
 * Frontière avec le système de la compagnie.
 *
 * Tout ce qui sort de l'application passe par cette interface — et rien d'autre.
 * C'est ce qui permet de démarrer sans aucune intégration, puis de brancher le
 * système de la gare, puis Digiparc, sans réécrire une ligne des écrans.
 *
 *   Horizon 1 — LocalProvider   : rien à demander à personne, tout est sur le téléphone.
 *   Horizon 2 — BridgeProvider  : la gare reçoit les demandes sur un écran.
 *   Horizon 3 — DigiparcProvider: synchronisation réelle avec leur logiciel.
 */

import type { Classe, Reservation, Voyageur } from '../types';

export interface DepartDisponible {
  id: string;
  ligneId: string;
  gareDepartId: string;
  date: string;
  heure: string;
  convocation: string;
  classe: Classe;
  tarif: number;
  placesTotal: number;
  placesLibres: number;
  siegesOccupes: number[];
}

export interface DemandeReservation {
  voyageurId: string;
  departId: string;
  ligneId: string;
  gareDepartId: string;
  date: string;
  heure: string;
  classe: Classe;
  siege: number | null;
  montant: number;
}

export interface ResultatSynchro {
  /** Vrai quand la compagnie a réellement reçu l'information. */
  transmise: boolean;
  /** Ce que l'utilisateur doit faire pour compléter, s'il reste quelque chose. */
  actionRestante?: string;
  reservation: Reservation;
}

export interface SyncProvider {
  readonly nom: string;
  readonly horizon: 1 | 2 | 3;
  /** Décrit à l'utilisateur ce qui est automatique et ce qui ne l'est pas encore. */
  readonly description: string;

  chercherDeparts(params: {
    ligneId: string;
    date: string;
    classe?: Classe;
  }): Promise<DepartDisponible[]>;

  historique(voyageurId: string): Promise<Reservation[]>;

  creerReservation(demande: DemandeReservation): Promise<ResultatSynchro>;

  confirmerPresence(reservationId: string): Promise<ResultatSynchro>;

  annuler(reservationId: string, motif?: string): Promise<ResultatSynchro>;

  reporter(reservationId: string, nouveau: { date: string; heure: string }): Promise<ResultatSynchro>;

  enregistrerPaiement(
    reservationId: string,
    moyen: Reservation['moyenPaiement'],
  ): Promise<ResultatSynchro>;

  /** Import d'un ticket papier scanné. */
  importerTicketPapier(donnees: TicketScanne, voyageur: Voyageur): Promise<Reservation>;
}

/** Champs lus sur un ticket papier — code-barres et texte imprimé. */
export interface TicketScanne {
  reference: string;
  ligneId?: string;
  trajetTexte?: string;
  date?: string;
  heure?: string;
  classe?: Classe;
  siege?: number | null;
  montant?: number;
  expireLe?: string;
}

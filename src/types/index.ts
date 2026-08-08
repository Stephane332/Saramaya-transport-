/** Modèle métier — transport de voyageurs Saramaya. */

export type Classe = 'CLASSIQUE' | 'VIP';

export type Ville =
  | 'Ouagadougou'
  | 'Bobo-Dioulasso'
  | 'Ouahigouya'
  | 'Koudougou'
  | 'Boromo';

export interface Gare {
  id: string;
  ville: Ville;
  nom: string;
  adresse: string;
  telephones: string[];
  /** Décalage en minutes par rapport à l'horaire de référence de la ligne. */
  decalageMinutes: number;
}

export interface Ligne {
  id: string;
  origine: Ville;
  destination: Ville;
  dureeMinutes: number;
  distanceKm: number;
  tarifs: Record<Classe, number>;
  /** Horaires de référence, au format HH:mm. */
  horaires: string[];
}

export interface Depart {
  id: string;
  ligneId: string;
  gareId: string;
  /** Date ISO du jour de départ (AAAA-MM-JJ). */
  date: string;
  /** Heure locale de départ, HH:mm. */
  heure: string;
  classe: Classe;
  placesTotal: number;
  placesOccupees: number;
}

/**
 * Cycle de vie d'une réservation.
 *
 * OPTION      — place tenue, non payée. C'est la seule qui puisse expirer seule.
 * PAYEE       — le client a payé. Plus aucun minuteur ne peut la détruire.
 * CONFIRMEE   — le client a répondu « je viens ».
 * SANS_REPONSE— l'échéance est passée sans réponse : signalé à la gare, jamais annulé d'office.
 * REPORTEE    — déplacée sur un autre départ dans la validité de 30 jours.
 * ANNULEE     — annulation explicite du client ou d'un agent.
 * EMBARQUE    — pointé à l'embarquement.
 * NO_SHOW     — absent au départ, constaté par un agent.
 */
export type StatutReservation =
  | 'OPTION'
  | 'PAYEE'
  | 'CONFIRMEE'
  | 'SANS_REPONSE'
  | 'REPORTEE'
  | 'ANNULEE'
  | 'EMBARQUE'
  | 'NO_SHOW';

export type MoyenPaiement = 'ORANGE_MONEY' | 'MOOV_MONEY' | 'ESPECES_GUICHET';

/** Un billet existe sur deux supports, avec une seule et même référence. */
export type Support = 'NUMERIQUE' | 'PAPIER';

export interface Voyageur {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  /** Carte Nationale d'Identité Burkinabè — exigée dès 18 ans à l'entrée de la gare. */
  cnib?: string;
  dateNaissance?: string;
}

export interface Reservation {
  id: string;
  /** Référence courte, identique sur le papier et le numérique. */
  reference: string;
  voyageurId: string;
  ligneId: string;
  gareDepartId: string;
  date: string;
  heure: string;
  /** Convocation : 30 minutes avant le départ. */
  convocation: string;
  classe: Classe;
  siege: number | null;
  montant: number;
  statut: StatutReservation;
  moyenPaiement?: MoyenPaiement;
  supports: Support[];

  creeLe: string;
  payeLe?: string;
  confirmeLe?: string;
  annuleLe?: string;
  /** Validité de 30 jours, comme sur le ticket papier. */
  expireLe: string;

  /** Renseigné quand la réservation provient d'un ticket papier scanné. */
  importeDuPapier?: boolean;
  /** Report : référence de la réservation qui remplace celle-ci. */
  remplaceePar?: string;
}

/** Décision rendue par le moteur de confirmation. */
export type DecisionConfirmation =
  | { type: 'RIEN_A_FAIRE'; motif: string }
  | { type: 'RAPPEL'; etape: EtapeRappel }
  | { type: 'ALARME'; etape: EtapeRappel }
  | { type: 'SIGNALER_A_LA_GARE'; motif: string }
  | { type: 'PROTEGEE'; motif: string };

export interface EtapeRappel {
  id: string;
  libelle: string;
  /** Minutes avant l'heure de départ. */
  minutesAvant: number;
  canal: 'PUSH' | 'PUSH_ET_SMS' | 'ALARME';
  intensite: 'DOUCE' | 'NORMALE' | 'INSISTANTE' | 'MAXIMALE';
  message: (ctx: { ligne: string; heure: string; convocation: string }) => string;
}

/** Résultat de la politique d'annulation. */
export interface PolitiqueAnnulation {
  peutReporter: boolean;
  remboursement: 'INTEGRAL' | 'PARTIEL' | 'AUCUN';
  montantRembourse: number;
  /** Vrai si un agent doit intervenir en caisse. */
  actionAgentRequise: boolean;
  motif: string;
  recommandation: 'REPORTER' | 'ANNULER';
}

/** Ligne de l'écran gare : ce que l'agent surveille. */
export interface LigneSurveillance {
  reservation: Reservation;
  voyageur: Voyageur;
  etat: 'CONFIRME' | 'PAYE_NON_CONFIRME' | 'SANS_REPONSE' | 'ANNULE' | 'INJOIGNABLE' | 'EMBARQUE';
  notificationDelivree: boolean;
  /** Vrai seulement pour les rares cas où l'agent doit décrocher son téléphone. */
  appelNecessaire: boolean;
}

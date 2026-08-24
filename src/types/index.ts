/** Modèle métier — transport de voyageurs Saramaya. */

/**
 * Les trois classes annoncées par la compagnie sur sa page Services :
 * « Transport Ordinaire / VIP Directe / VIP 1e Classe ». Tous les cars sont
 * climatisés — ce n'est donc pas un critère de distinction.
 */
export type Classe = 'ORDINAIRE' | 'VIP_1RE' | 'VIP_DIRECTE';

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
  /**
   * Départs de la journée. Chaque créneau porte sa classe : la compagnie ne
   * laisse pas choisir, c'est le départ qui est Ordinaire, VIP 1re ou VIP Directe.
   */
  departs: DepartHoraire[];
}

export interface DepartHoraire {
  heure: string;
  classe: Classe;
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
  /**
   * Date d'expiration de la CNIB, AAAA-MM-JJ.
   *
   * Elle sert au rappel qui prévient avant qu'une carte périmée pose problème à un
   * contrôle routier. Elle reste sur le téléphone, et le rappel est une notification
   * locale : ni serveur, ni transmission. Le service est annoncé au voyageur, jamais
   * caché — voir docs/presentation/donnees-des-voyageurs.md.
   */
  cnibExpireLe?: string;
  /**
   * Chemin local de la photo de la carte. Un chemin, pas l'image : le fichier reste
   * dans l'espace privé de l'application, et n'est jamais transmis.
   */
  cnibPhotoUri?: string;
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
  /** Le voyageur a déclaré avoir payé (mobile money). Non vérifié tant qu'il n'y a pas de backend. */
  paiementDeclareLe?: string;
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
  /*
   * Le canal s'appelait « PUSH_ET_SMS », et aucun SMS n'a jamais été envoyé : ce nom
   * décrivait une intention, pas le code. L'application n'envoie jamais de message
   * toute seule — sa politique de confidentialité l'affirme, et seuls partent les
   * messages que l'utilisateur envoie lui-même. Trois canaux, donc, tous locaux.
   */
  canal: 'PUSH' | 'PUSH_INSISTANT' | 'ALARME';
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


/* ── Courrier et colis ──────────────────────────────────────────────────────
 *
 * La compagnie assure la « distribution et réception de courrier ». Aujourd'hui,
 * l'expéditeur reçoit un code au guichet et l'envoie lui-même au destinataire par
 * WhatsApp ; rien ne suit le colis, et un code perdu devient un litige.
 */

/**
 * Cycle de vie d'un colis.
 *
 * `A_DEPOSER` est le premier état, et il est important : l'application **prépare**
 * un envoi, elle ne le dépose pas. Tant que l'expéditeur n'est pas passé au
 * guichet, rien n'a été remis et rien n'a été payé. Afficher « Déposé » à la
 * seconde où le formulaire est validé serait le même mensonge que délivrer un
 * billet avant paiement.
 */
export type StatutColis =
  | 'A_DEPOSER'
  | 'DEPOSE'
  | 'EN_TRANSIT'
  | 'ARRIVE'
  | 'RETIRE'
  | 'RETOUR_EXPEDITEUR';

export type TailleColis = 'ENVELOPPE' | 'PETIT' | 'MOYEN' | 'GRAND';

export interface Colis {
  id: string;
  /** Référence interne, comme pour un billet. */
  reference: string;
  /**
   * Le code que le destinataire présente au guichet pour retirer le colis.
   *
   * Tant que l'application n'est pas reliée au système de la compagnie, c'est le
   * guichet qui fait foi : s'il remet un autre code au dépôt, c'est celui-là qui
   * est enregistré ici, par-dessus celui que l'application avait proposé.
   */
  codeRetrait: string;
  /** Vrai quand le code vient du guichet, et non de l'application. */
  codeDuGuichet?: boolean;

  expediteurId: string;
  destinataireNom: string;
  destinataireTelephone: string;

  gareDepartId: string;
  gareArriveeId: string;

  taille: TailleColis;
  description: string;
  /** Au-delà de 50 000 F, la déclaration est obligatoire (conditions au dos du ticket). */
  valeurDeclaree: number;
  montant: number;

  statut: StatutColis;
  /** Moment où l'envoi a été préparé dans l'application. */
  prepareLe: string;
  /** Renseigné seulement quand le colis a réellement été remis au guichet. */
  deposeLe?: string;
  arriveLe?: string;
  retireLe?: string;
  /** Vrai dès que le code a été transmis au destinataire. */
  codePartage: boolean;
  /**
   * Moyen de paiement **prévu**, pas constaté. Le règlement se fait au dépôt, et
   * l'application n'a aucun moyen de le vérifier tant qu'elle n'est pas reliée au
   * système de la compagnie.
   */
  moyenPaiement?: MoyenPaiement;
  /** Renseigné quand l'expéditeur déclare avoir réglé au guichet. */
  regleLe?: string;
}


/**
 * Une caisse (guichet) et son compte Orange Money de réception.
 *
 * Chaque caissière a son propre numéro : c'est là que les paiements d'une
 * réservation doivent arriver. L'agent le configure sur son poste ; il alimentera
 * les instructions de paiement du voyageur une fois le système partagé en place.
 */
export interface Caisse {
  nom: string;
  gareId: string;
  numeroOrangeMoney: string;
  codePaiement?: string;
}

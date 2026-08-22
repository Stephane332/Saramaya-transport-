/**
 * Réseau Saramaya Transport.
 *
 * Horaires et tarifs : publiés par la compagnie pour Ouahigouya–Ouagadougou et
 * Ouagadougou–Bobo-Dioulasso. Koudougou et Boromo font partie des cinq villes
 * desservies, mais leurs horaires n'ont pas été trouvés publiquement — ils sont
 * marqués comme estimés ci-dessous.
 *
 * Distances routières :
 *   Ouagadougou – Ouahigouya      182 km  (mesuré, RN2)
 *   Ouagadougou – Bobo-Dioulasso  356 km  (mesuré, RN1)
 *   Ouagadougou – Boromo          180 km  (RN1 ; Boromo est à mi-chemin de Bobo)
 *   Ouagadougou – Koudougou       100 km  (route ; 75 km à vol d'oiseau)
 *
 * N'inscrivez ici que des valeurs vérifiables : elles alimentent le compteur de
 * kilomètres parcourus affiché au voyageur.
 */

import type { Classe, Gare, Ligne, Ville } from '../types';

export const VILLES: Ville[] = [
  'Ouagadougou',
  'Bobo-Dioulasso',
  'Ouahigouya',
  'Koudougou',
  'Boromo',
];

export const GARES: Gare[] = [
  {
    id: 'gare-ouaga-tampouy',
    ville: 'Ouagadougou',
    nom: 'Gare de Tampouy',
    adresse: 'Tampouy, Ouagadougou',
    telephones: ['60 81 85 85', '60 81 86 86'],
    decalageMinutes: 0,
  },
  {
    id: 'gare-ouaga-gounghin',
    ville: 'Ouagadougou',
    nom: 'Gare de Gounghin',
    adresse: "Face à l'échangeur de Gounghin, Ouagadougou",
    telephones: ['60 81 86 86', '60 81 87 87'],
    // Les départs de Gounghin ont lieu 30 minutes après ceux de Tampouy.
    decalageMinutes: 30,
  },
  {
    id: 'gare-ouaga-cdg',
    ville: 'Ouagadougou',
    nom: 'Gare Charles de Gaulle',
    adresse: 'Avenue Charles de Gaulle, Ouagadougou',
    telephones: ['60 81 85 85'],
    // Sur la ligne de Bobo, Charles de Gaulle part une heure avant.
    decalageMinutes: -60,
  },
  {
    id: 'gare-ouaga-wemtenga',
    ville: 'Ouagadougou',
    nom: 'Gare de Wemtenga',
    adresse: 'Wemtenga, Ouagadougou',
    telephones: ['60 94 22 22', '04 64 67 38'],
    decalageMinutes: 0,
  },
  {
    id: 'gare-bobo-tounouma',
    ville: 'Bobo-Dioulasso',
    nom: 'Gare de Tounouma',
    adresse: 'Boulevard Téléphone, Tounouma, Bobo-Dioulasso',
    telephones: ['20 95 64 43', '60 81 88 88', '60 81 89 89'],
    decalageMinutes: 0,
  },
  {
    id: 'gare-ouahigouya',
    ville: 'Ouahigouya',
    nom: 'Gare de Ouahigouya',
    adresse: 'Ouahigouya, région du Nord',
    // Chef de gare et guichet, relevés sur le ticket papier.
    telephones: ['60 94 24 24', '60 94 23 23'],
    decalageMinutes: 0,
  },
  {
    id: 'gare-koudougou',
    ville: 'Koudougou',
    nom: 'Gare de Koudougou',
    adresse: 'Koudougou, région du Centre-Ouest',
    telephones: ['60 81 85 85'],
    decalageMinutes: 0,
  },
  {
    id: 'gare-boromo',
    ville: 'Boromo',
    nom: 'Gare de Boromo',
    adresse: 'Boromo, région de la Boucle du Mouhoun',
    telephones: ['60 81 85 85'],
    decalageMinutes: 0,
  },
];

/**
 * Départs Ouagadougou ↔ Bobo-Dioulasso, repris tels quels de la page
 * « Horaires & Tarifs » de la compagnie : chaque créneau porte sa classe.
 *
 * Une source secondaire (annuaire touristique) donne une grille légèrement
 * différente. En cas de doute, c'est la leur qui fait foi — à reconfirmer
 * au guichet avant toute présentation.
 */
const DEPARTS_OUAGA_BOBO: Ligne['departs'] = [
  { heure: '08:00', classe: 'ORDINAIRE' },
  { heure: '08:30', classe: 'VIP_1RE' },
  { heure: '09:30', classe: 'VIP_DIRECTE' },
  { heure: '10:30', classe: 'ORDINAIRE' },
  { heure: '12:30', classe: 'ORDINAIRE' },
  { heure: '14:30', classe: 'ORDINAIRE' },
  { heure: '16:30', classe: 'VIP_1RE' },
  { heure: '18:30', classe: 'VIP_DIRECTE' },
  { heure: '22:30', classe: 'ORDINAIRE' },
];

/**
 * Ouahigouya ↔ Ouagadougou : les quatre horaires sont publiés, mais pas la
 * classe de chaque départ. Le créneau de 16:00 est confirmé Ordinaire par un
 * ticket réel à 3 500 F ; les autres sont à vérifier au guichet.
 */
const DEPARTS_OUAHIGOUYA: Ligne['departs'] = [
  { heure: '06:00', classe: 'ORDINAIRE' },
  { heure: '10:00', classe: 'VIP_1RE' },
  { heure: '14:00', classe: 'ORDINAIRE' },
  { heure: '16:00', classe: 'ORDINAIRE' },
];

export const LIGNES: Ligne[] = [
  {
    id: 'ligne-ouahigouya-ouaga',
    origine: 'Ouahigouya',
    destination: 'Ouagadougou',
    dureeMinutes: 180,
    distanceKm: 182,
    tarifs: { ORDINAIRE: 3500, VIP_1RE: 5000, VIP_DIRECTE: 5000 },
    departs: DEPARTS_OUAHIGOUYA,
  },
  {
    id: 'ligne-ouaga-ouahigouya',
    origine: 'Ouagadougou',
    destination: 'Ouahigouya',
    dureeMinutes: 180,
    distanceKm: 182,
    tarifs: { ORDINAIRE: 3500, VIP_1RE: 5000, VIP_DIRECTE: 5000 },
    departs: DEPARTS_OUAHIGOUYA,
  },
  {
    id: 'ligne-ouaga-bobo',
    origine: 'Ouagadougou',
    destination: 'Bobo-Dioulasso',
    dureeMinutes: 300,
    distanceKm: 356,
    tarifs: { ORDINAIRE: 6500, VIP_1RE: 8000, VIP_DIRECTE: 8000 },
    departs: DEPARTS_OUAGA_BOBO,
  },
  {
    id: 'ligne-bobo-ouaga',
    origine: 'Bobo-Dioulasso',
    destination: 'Ouagadougou',
    dureeMinutes: 300,
    distanceKm: 356,
    tarifs: { ORDINAIRE: 6500, VIP_1RE: 8000, VIP_DIRECTE: 8000 },
    departs: DEPARTS_OUAGA_BOBO,
  },
  // Distances mesurées, mais horaires et classes estimés — à confirmer.
  {
    id: 'ligne-ouaga-koudougou',
    origine: 'Ouagadougou',
    destination: 'Koudougou',
    dureeMinutes: 105,
    distanceKm: 100,
    tarifs: { ORDINAIRE: 2500, VIP_1RE: 3500, VIP_DIRECTE: 3500 },
    departs: [
      { heure: '07:00', classe: 'ORDINAIRE' },
      { heure: '11:00', classe: 'ORDINAIRE' },
      { heure: '15:00', classe: 'VIP_1RE' },
      { heure: '18:00', classe: 'ORDINAIRE' },
    ],
  },
  {
    id: 'ligne-ouaga-boromo',
    origine: 'Ouagadougou',
    destination: 'Boromo',
    dureeMinutes: 165,
    distanceKm: 180,
    tarifs: { ORDINAIRE: 3500, VIP_1RE: 4500, VIP_DIRECTE: 4500 },
    departs: [
      { heure: '08:30', classe: 'ORDINAIRE' },
      { heure: '12:30', classe: 'ORDINAIRE' },
      { heure: '18:30', classe: 'VIP_1RE' },
    ],
  },
];

/**
 * Valeurs initiales des formulaires, désignées par leur identifiant plutôt que par
 * une position dans un tableau : réordonner les listes ne doit pas changer
 * silencieusement le trajet proposé par défaut à un voyageur.
 */
export const LIGNE_DEFAUT = 'ligne-ouahigouya-ouaga';
export const GARE_DEPART_DEFAUT = 'gare-ouaga-tampouy';
export const GARE_ARRIVEE_DEFAUT = 'gare-bobo-tounouma';

export function ligneParId(id: string): Ligne | undefined {
  return LIGNES.find((l) => l.id === id);
}

export function gareParId(id: string): Gare | undefined {
  return GARES.find((g) => g.id === id);
}

export function garesDeLaVille(ville: Ville): Gare[] {
  return GARES.filter((g) => g.ville === ville);
}

export function libelleLigne(ligneId: string): string {
  const l = ligneParId(ligneId);
  return l ? `${l.origine} → ${l.destination}` : ligneId;
}

/** Lignes partant d'une ville donnée. */
export function lignesDepuis(ville: Ville): Ligne[] {
  return LIGNES.filter((l) => l.origine === ville);
}

/**
 * Ce qu'on sait des voitures — et ce qu'on n'en sait pas.
 *
 * La compagnie publie une seule chose sur l'aménagement : le **VIP est en 2+1**,
 * « trois sièges par rangée au lieu de quatre », contre 2+2 pour l'ordinaire. C'est
 * vérifiable, c'est ici.
 *
 * ## Ce qui a été retiré, et pourquoi
 *
 * Il y avait ici un plan complet : seize rangées, une banquette de cinq au fond,
 * soixante-neuf places pour l'ordinaire. **Rien de tout cela n'était vérifié.** Ces
 * nombres avaient été inventés pour pouvoir dessiner une cabine à l'écran, et
 * l'écran laissait ensuite le voyageur y choisir sa place — deux fautes qui se
 * tenaient l'une l'autre.
 *
 * La première contredit la règle du projet : on n'affiche pas ce qu'on ne sait pas.
 * Un voyageur pouvait demander le siège 69 d'un car qui n'en compte peut-être que
 * cinquante.
 *
 * La seconde contredit la procédure de la compagnie. Chez Saramaya, la place est
 * **attribuée par l'agent** au moment de l'encaissement : leur billetterie affiche
 * les places libres du départ, l'agent en clique une, et le billet s'imprime. Le
 * voyageur ne choisit pas — il peut demander, et l'agent honore la demande si la
 * place est libre. L'application dit donc exactement cela : un souhait transmis à la
 * gare, jamais une réservation de place.
 *
 * Le nombre de places par voiture viendra du système de la compagnie, comme les
 * places déjà vendues. D'ici là, il n'est écrit nulle part.
 */
export interface PlanBus {
  classe: Classe;
  /** Sièges de chaque côté du couloir. La seule donnée d'aménagement publiée. */
  gauche: number;
  droite: number;
  equipements: string[];
}

export const PLANS_BUS: Record<Classe, PlanBus> = {
  ORDINAIRE: {
    classe: 'ORDINAIRE',
    gauche: 2,
    droite: 2,
    equipements: ['Climatisation', 'Sièges inclinables'],
  },
  VIP_1RE: {
    classe: 'VIP_1RE',
    gauche: 2,
    droite: 1,
    equipements: [
      'Sièges extra-larges',
      'Écran TV individuel',
      'Écouteurs fournis',
      'Chargeur USB',
      'Boisson offerte',
      'Climatisation',
    ],
  },
  VIP_DIRECTE: {
    classe: 'VIP_DIRECTE',
    gauche: 2,
    droite: 1,
    equipements: [
      'Sans arrêt intermédiaire',
      'Sièges extra-larges',
      'Écran TV individuel',
      'Chargeur USB',
      'Boisson offerte',
      'Climatisation',
    ],
  },
};

/** « 2+2 », « 2+1 » — la disposition d'une rangée, telle que la compagnie l'annonce. */
export function dispositionRangee(classe: Classe): string {
  const p = PLANS_BUS[classe];
  return `${p.gauche}+${p.droite}`;
}

/** Libellés courts, tels que la compagnie les emploie. */
export const LIBELLES_CLASSE: Record<Classe, string> = {
  ORDINAIRE: 'Ordinaire',
  VIP_1RE: 'VIP 1re classe',
  VIP_DIRECTE: 'VIP directe',
};

export const LIBELLES_CLASSE_COURT: Record<Classe, string> = {
  ORDINAIRE: 'ORDINAIRE',
  VIP_1RE: 'VIP 1RE',
  VIP_DIRECTE: 'VIP DIRECTE',
};

/** Règles de transport imprimées au dos du ticket papier. */
export const CONDITIONS_TRANSPORT = [
  'Pour votre sécurité, les marchandises et objets lourds ne sont pas acceptés.',
  "Saramaya Transport ne peut être engagé pour la perte des bagages restés sous votre garde.",
  'À 5 minutes du départ, tout passager absent est remplacé par un passager de la liste d\'attente.',
  'Vérifiez l\'heure et la date dès réception du ticket.',
  'Prévenez la gare à temps si vous ne pouvez pas voyager, afin que la place soit remise en vente.',
  'Dès 18 ans, la CNIB ou le passeport est exigé à l\'entrée de la gare.',
  'Tout bagage d\'une valeur supérieure à 50 000 F doit faire l\'objet d\'une déclaration.',
] as const;

/** Minutes entre la convocation et le départ, comme imprimé sur le ticket. */
export const MINUTES_CONVOCATION = 30;

/** Validité d'un ticket, en jours. */
export const JOURS_VALIDITE = 30;

/** Minutes avant le départ où la place d'un absent est cédée à la liste d'attente. */
export const MINUTES_LIBERATION_PLACE = 5;


/**
 * Numéros de réservation, ligne par ligne, relevés sur le site de la compagnie.
 * Ce sont eux qu'on appelle aujourd'hui pour réserver — et eux que l'application
 * pré-remplit pour que l'agent n'ait plus qu'à saisir.
 */
export const TELEPHONES_RESERVATION: Record<string, string[]> = {
  'ligne-ouaga-bobo': ['60 81 86 86', '60 81 87 87', '04 63 22 27'],
  'ligne-bobo-ouaga': ['60 81 89 89', '60 94 25 25', '04 67 48 38'],
  'ligne-ouahigouya-ouaga': ['53 89 60 60'],
  'ligne-ouaga-ouahigouya': ['03 93 25 25'],
  'ligne-ouaga-koudougou': ['50 97 74 74'],
  'ligne-koudougou-ouaga': ['50 97 73 73'],
  'ligne-ouaga-boromo': ['60 94 29 29'],
};

/** Contacts généraux, tels que publiés par la compagnie. */
export const CONTACTS_COMPAGNIE = {
  telephone: '+226 20 95 23 47',
  mobile: '+226 70 27 02 57',
  email: 'contact@saramayatransport.com',
  site: 'www.saramayatransport.com',
  devise: 'Sécurité, Confort, Respect',
} as const;

/**
 * Délai de paiement d'une réservation faite en ligne.
 *
 * C'est la règle de leur propre espace client : passé ce délai, une fenêtre
 * demande au voyageur « Avez-vous pu effectuer le paiement dans le délai de
 * 10 minutes ? ». Rien ne vérifie la réponse — c'est précisément ce trou que
 * l'application vient combler.
 */
export const MINUTES_OPTION_PAIEMENT = 10;


/** Clé unique d'un départ — sert d'identifiant, sans rien simuler. */
export function identifiantDepart(
  ligneId: string,
  date: string,
  heure: string,
  classe: Classe,
): string {
  return `${ligneId}|${date}|${heure}|${classe}`;
}


/**
 * Coordonnées Orange Money par agence, relevées sur le site de la compagnie.
 * Ce sont les vrais numéros et codes de paiement — l'application les affiche pour
 * que le voyageur paie par le canal existant, sans rien inventer.
 */
export interface PaiementAgence {
  villes: Ville[];
  intitule: string;
  numeros: string[];
  codes: string[];
}

export const PAIEMENTS_ORANGE_MONEY: PaiementAgence[] = [
  {
    villes: ['Bobo-Dioulasso'],
    intitule: 'Bobo',
    numeros: ['05 48 40 00', '05 48 40 01'],
    codes: ['144107580857', '144101249338'],
  },
  {
    villes: ['Ouagadougou'],
    intitule: 'Ouaga (Gounghin / Wemtenga)',
    numeros: ['05 48 40 02', '05 48 40 03', '05 48 40 04', '05 48 40 05'],
    codes: ['144101375257', '144102254980', '144108988511', '144103586558'],
  },
];

/**
 * Coordonnées Orange Money correspondant à la ville d'une gare.
 *
 * **Aucun repli.** La fonction retombait auparavant sur l'agence de Ouagadougou
 * pour toute ville non listée — or seules Ouaga et Bobo ont des comptes relevés.
 * Un départ de Ouahigouya, qui est la ligne par défaut de l'application, affichait
 * donc les numéros de Ouaga comme destination du paiement : le voyageur envoyait
 * son argent à la mauvaise agence, en toute confiance, et se présentait au guichet
 * avec un versement introuvable.
 *
 * Ne rien savoir se dit ; cela ne se devine pas. L'écran du billet renvoie alors
 * vers le téléphone de la gare concernée, qui est, lui, exact.
 */
export function paiementPourVille(ville: Ville): PaiementAgence | undefined {
  return PAIEMENTS_ORANGE_MONEY.find((p) => p.villes.includes(ville));
}

/**
 * Réseau Saramaya Transport.
 *
 * Les lignes Ouahigouya–Ouagadougou et Ouagadougou–Bobo-Dioulasso reprennent les
 * horaires et tarifs publiés par la compagnie. Koudougou et Boromo font partie des
 * cinq villes desservies, mais leurs horaires n'ont pas été trouvés publiquement :
 * les valeurs ci-dessous sont des estimations, à corriger sur place.
 */

import type { Gare, Ligne, Ville } from '../types';

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

export const LIGNES: Ligne[] = [
  {
    id: 'ligne-ouahigouya-ouaga',
    origine: 'Ouahigouya',
    destination: 'Ouagadougou',
    dureeMinutes: 180,
    distanceKm: 182,
    tarifs: { CLASSIQUE: 3500, VIP: 5000 },
    horaires: ['06:00', '10:00', '14:00', '16:00'],
  },
  {
    id: 'ligne-ouaga-ouahigouya',
    origine: 'Ouagadougou',
    destination: 'Ouahigouya',
    dureeMinutes: 180,
    distanceKm: 182,
    tarifs: { CLASSIQUE: 3500, VIP: 5000 },
    horaires: ['06:00', '10:00', '14:00', '16:00'],
  },
  {
    id: 'ligne-ouaga-bobo',
    origine: 'Ouagadougou',
    destination: 'Bobo-Dioulasso',
    dureeMinutes: 300,
    distanceKm: 360,
    tarifs: { CLASSIQUE: 6500, VIP: 8000 },
    horaires: ['08:30', '09:30', '12:30', '14:30', '18:30', '22:30', '23:45'],
  },
  {
    id: 'ligne-bobo-ouaga',
    origine: 'Bobo-Dioulasso',
    destination: 'Ouagadougou',
    dureeMinutes: 300,
    distanceKm: 360,
    tarifs: { CLASSIQUE: 6500, VIP: 8000 },
    horaires: ['08:30', '09:30', '12:30', '14:30', '18:30', '22:30', '23:45'],
  },
  // Horaires estimés — à confirmer auprès de la compagnie.
  {
    id: 'ligne-ouaga-koudougou',
    origine: 'Ouagadougou',
    destination: 'Koudougou',
    dureeMinutes: 105,
    distanceKm: 100,
    tarifs: { CLASSIQUE: 2500, VIP: 3500 },
    horaires: ['07:00', '11:00', '15:00', '18:00'],
  },
  {
    id: 'ligne-ouaga-boromo',
    origine: 'Ouagadougou',
    destination: 'Boromo',
    dureeMinutes: 165,
    distanceKm: 180,
    tarifs: { CLASSIQUE: 3500, VIP: 4500 },
    horaires: ['08:30', '12:30', '18:30'],
  },
];

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
 * Plans de bus. Le VIP est en 2+1 (sièges extra-larges, écran individuel,
 * chargeur USB, boisson offerte) ; le classique en 2+2 climatisé.
 */
export interface PlanBus {
  classe: 'CLASSIQUE' | 'VIP';
  rangees: number;
  /** Sièges à gauche du couloir, puis à droite. */
  gauche: number;
  droite: number;
  /** Banquette du fond, sur toute la largeur. */
  fond: number;
  equipements: string[];
}

export const PLANS_BUS: Record<'CLASSIQUE' | 'VIP', PlanBus> = {
  CLASSIQUE: {
    classe: 'CLASSIQUE',
    rangees: 16,
    gauche: 2,
    droite: 2,
    fond: 5,
    equipements: ['Climatisation', 'Sièges inclinables'],
  },
  VIP: {
    classe: 'VIP',
    rangees: 13,
    gauche: 2,
    droite: 1,
    fond: 4,
    equipements: [
      'Sièges extra-larges',
      'Écran TV individuel',
      'Écouteurs fournis',
      'Chargeur USB',
      'Boisson offerte',
    ],
  },
};

export function nombreDeSieges(classe: 'CLASSIQUE' | 'VIP'): number {
  const p = PLANS_BUS[classe];
  return p.rangees * (p.gauche + p.droite) + p.fond;
}

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

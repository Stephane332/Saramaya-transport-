/**
 * Courrier et colis.
 *
 * La compagnie annonce sur sa page Services la « Distribution et Réception de
 * courrier ». Aujourd'hui, l'expéditeur repart du guichet avec un code, qu'il
 * transmet lui-même au destinataire par WhatsApp. Rien ne suit le colis : ni
 * l'expéditeur ni le destinataire ne savent quand il arrive, et un code perdu
 * devient une discussion au guichet.
 *
 * Les tarifs ci-dessous sont **estimés** — la compagnie ne les publie pas. Ils
 * sont regroupés ici pour être remplacés par la vraie grille en un seul endroit.
 */

import type { TailleColis } from '../types';

/**
 * Seuil de déclaration obligatoire, repris des conditions imprimées au dos du
 * ticket : « Tout bagage dont la valeur excède 50 000 F doit faire l'objet d'une
 * déclaration ».
 */
export const SEUIL_DECLARATION = 50000;

export interface FormatColis {
  taille: TailleColis;
  libelle: string;
  description: string;
  /** Tarif de base, avant coefficient de distance. */
  base: number;
  icone: string;
}

export const FORMATS_COLIS: Record<TailleColis, FormatColis> = {
  ENVELOPPE: {
    taille: 'ENVELOPPE',
    libelle: 'Courrier',
    description: 'Documents, plis, papiers',
    base: 1000,
    icone: 'mail',
  },
  PETIT: {
    taille: 'PETIT',
    libelle: 'Petit colis',
    description: "Jusqu'à 5 kg — sac à main, boîte à chaussures",
    base: 2000,
    icone: 'cube',
  },
  MOYEN: {
    taille: 'MOYEN',
    libelle: 'Colis moyen',
    description: '5 à 20 kg — carton, valise',
    base: 4000,
    icone: 'file-tray-full',
  },
  GRAND: {
    taille: 'GRAND',
    libelle: 'Grand colis',
    description: '20 à 50 kg — gros carton, sac de marchandises',
    base: 7000,
    icone: 'archive',
  },
};

/**
 * Part du tarif calculée sur la valeur déclarée.
 *
 * Règle indiquée par la compagnie : au-delà de 50 000 F de valeur, le transport
 * revient à **10 % de cette valeur** — 5 000 F pour 50 000 F, 10 000 F pour
 * 100 000 F. En dessous de ce seuil, ce sont le format et la distance qui priment.
 *
 * À reconfirmer au guichet : c'est la dernière donnée tarifaire non vérifiée
 * publiquement.
 */
export const TAUX_VALEUR = 0.1;

/**
 * Tarif d'un colis : le plus élevé entre le tarif « format × distance » (pour un
 * petit colis sans grande valeur) et 10 % de la valeur déclarée (pour un colis de
 * valeur, où c'est l'assurance du transport qui compte).
 */
export function tarifColis(
  taille: TailleColis,
  distanceKm: number,
  valeurDeclaree = 0,
): number {
  const coefficient = distanceKm <= 150 ? 1 : distanceKm <= 250 ? 1.3 : 1.7;
  const parFormat = FORMATS_COLIS[taille].base * coefficient;

  // La part sur la valeur ne s'applique qu'au-delà du seuil de déclaration.
  const parValeur = valeurDeclaree > SEUIL_DECLARATION ? valeurDeclaree * TAUX_VALEUR : 0;

  return Math.round(Math.max(parFormat, parValeur) / 500) * 500;
}

/**
 * Ce que la compagnie n'accepte pas, d'après ses propres conditions :
 * « Pour votre sécurité, nous ne prenons pas les marchandises et les objets lourds ».
 */
export const REFUSES = [
  'Objets de plus de 50 kg',
  'Produits inflammables ou dangereux',
  'Animaux vivants',
  'Denrées périssables non emballées',
  'Espèces et bijoux non déclarés',
] as const;

/**
 * La frise de suivi commence par « À déposer », et c'est volontaire : préparer un
 * envoi dans l'application ne dépose rien. La première étape n'est franchie que
 * lorsque l'expéditeur a réellement remis le colis au guichet.
 */
export const ETAPES_SUIVI: Array<{
  statut: 'A_DEPOSER' | 'DEPOSE' | 'EN_TRANSIT' | 'ARRIVE' | 'RETIRE';
  libelle: string;
  detail: string;
  icone: string;
}> = [
  { statut: 'A_DEPOSER', libelle: 'À déposer', detail: 'Envoi préparé, à remettre au guichet', icone: 'create' },
  { statut: 'DEPOSE', libelle: 'Déposé', detail: 'Enregistré à la gare de départ', icone: 'checkmark-circle' },
  { statut: 'EN_TRANSIT', libelle: 'En route', detail: 'Chargé dans le car', icone: 'bus' },
  { statut: 'ARRIVE', libelle: 'Arrivé', detail: 'Disponible au guichet', icone: 'location' },
  { statut: 'RETIRE', libelle: 'Retiré', detail: 'Remis au destinataire', icone: 'hand-left' },
];

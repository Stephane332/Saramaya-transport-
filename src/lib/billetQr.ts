/**
 * Le QR code du billet, et sa vérification à la porte du bus.
 *
 * Aujourd'hui, le contrôleur lit un ticket papier : il déchiffre une écriture
 * manuscrite pour le siège, et rien ne lui dit si la place a été payée. Ce QR
 * répond aux deux, **sans réseau** — parce qu'à la porte d'un car, à Tounouma ou à
 * Ouahigouya, il n'y en a pas toujours.
 *
 * ## Ce que contient le QR
 *
 * Tout ce dont le contrôleur a besoin : référence, nom, trajet, date, heure,
 * classe, siège, montant, état du paiement, date d'expiration. Rien à interroger,
 * rien à télécharger : le billet se suffit à lui-même.
 *
 * ## Ce que vaut la signature — dit honnêtement
 *
 * Le contenu est accompagné d'une signature HMAC-SHA256. Elle garantit qu'un QR
 * n'a **pas été modifié** : changer un siège, une date ou faire passer un billet
 * impayé pour payé invalide la signature immédiatement, et le contrôleur le voit.
 *
 * Ce qu'elle ne garantit pas encore : la clé est embarquée dans l'application.
 * Quelqu'un de déterminé peut l'extraire et fabriquer un faux billet cohérent.
 * C'est une protection contre la falsification ordinaire — la retouche d'un QR
 * existant — et non contre un faussaire outillé.
 *
 * La vraie ancre de confiance viendra de la compagnie : c'est **son** système qui
 * signera, avec une clé qu'elle seule détient, et l'application de contrôle ne fera
 * que vérifier. Le format ci-dessous ne changera pas ce jour-là : seule l'origine
 * de la clé changera. C'est pourquoi elle est déjà lue depuis l'environnement.
 */

import {
  depuisBase64Url,
  hmacSha256,
  versBase64Url,
  versOctets,
  versTexte,
} from './sha256';
import { billetEmis } from './parcours';
import type { Classe, Reservation, StatutReservation, Voyageur } from '../types';

/** Préfixe de version : il permettra de faire évoluer le format sans casser l'ancien. */
const VERSION = 'SB1';

/**
 * Clé de signature. Fournie par la compagnie le jour où son système signe les
 * billets ; d'ici là, une clé de projet, qui protège de la retouche d'un QR mais
 * pas d'un faussaire déterminé (voir l'en-tête).
 */
const CLE = versOctets(process.env.EXPO_PUBLIC_CLE_BILLET ?? 'siraba-cle-de-projet-v1');

/** 16 octets suffisent : la signature reste courte, le QR reste lisible de loin. */
const OCTETS_SIGNATURE = 16;

/** Contenu utile du billet, aux clés volontairement courtes. */
export interface ContenuBillet {
  /** Référence du billet. */
  r: string;
  /** Nom et prénom du voyageur. */
  n: string;
  /** Identifiant de ligne. */
  l: string;
  /** Date de voyage, AAAA-MM-JJ. */
  d: string;
  /** Heure de départ, HH:mm. */
  h: string;
  c: Classe;
  /** Siège, ou null s'il est attribué au guichet. */
  s: number | null;
  /** Montant en francs CFA. */
  m: number;
  /** État de la réservation au moment de l'émission. */
  p: StatutReservation;
  /** Date d'expiration, AAAA-MM-JJ. */
  e: string;
}

function signer(corps: string): string {
  return versBase64Url(hmacSha256(CLE, versOctets(corps)).slice(0, OCTETS_SIGNATURE));
}

/**
 * Fabrique le contenu du QR d'une réservation payée.
 *
 * Renvoie une chaîne vide tant que le paiement n'est pas établi. C'est volontaire et
 * c'est une garde, pas une commodité d'affichage : un QR est un titre de transport,
 * et il ne doit pas exister avant que la compagnie ait constaté le paiement. Un
 * voyageur qui présenterait un tel code croirait de bonne foi être en règle, et
 * l'agent découvrirait le contraire à la porte du bus.
 */
export function construireQrBillet(r: Reservation, voyageur: Voyageur): string {
  if (!billetEmis(r)) return '';

  const contenu: ContenuBillet = {
    r: r.reference,
    n: `${voyageur.nom} ${voyageur.prenom}`.trim(),
    l: r.ligneId,
    d: r.date,
    h: r.heure,
    c: r.classe,
    s: r.siege,
    m: r.montant,
    p: r.statut,
    e: r.expireLe.slice(0, 10),
  };
  const corps = `${VERSION}.${versBase64Url(versOctets(JSON.stringify(contenu)))}`;
  return `${corps}.${signer(corps)}`;
}

/** Verdict rendu au contrôleur. */
export type Verdict =
  | 'VALIDE'
  | 'NON_PAYE'
  | 'ANNULE'
  | 'EXPIRE'
  | 'MAUVAIS_JOUR'
  | 'SIGNATURE_INVALIDE'
  | 'ILLISIBLE';

export interface Controle {
  verdict: Verdict;
  /** Renseigné dès que le QR est lisible et authentique, même si le verdict est négatif. */
  billet?: ContenuBillet;
  /** Phrase à afficher à l'agent, en clair. */
  message: string;
}

/**
 * Vérifie un QR scanné.
 *
 * L'ordre des contrôles suit la gravité : on établit d'abord que le billet est
 * authentique, ensuite seulement on juge s'il donne droit à monter. Un billet
 * falsifié et un billet simplement impayé n'appellent pas la même réaction de
 * l'agent, et les confondre serait injuste pour le voyageur.
 */
export function verifierQrBillet(texte: string, maintenant = new Date()): Controle {
  const parts = texte.trim().split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) {
    return { verdict: 'ILLISIBLE', message: "Ce code n'est pas un billet Saramaya." };
  }

  const [version, charge, signature] = parts as [string, string, string];

  if (signer(`${version}.${charge}`) !== signature) {
    return {
      verdict: 'SIGNATURE_INVALIDE',
      message: 'Billet falsifié ou modifié. Ne pas laisser monter, prévenir le chef de gare.',
    };
  }

  let billet: ContenuBillet;
  try {
    billet = JSON.parse(versTexte(depuisBase64Url(charge)));
  } catch {
    return { verdict: 'ILLISIBLE', message: 'Contenu du billet illisible.' };
  }

  const jour = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}-${String(maintenant.getDate()).padStart(2, '0')}`;

  if (billet.p === 'ANNULEE') {
    return { verdict: 'ANNULE', billet, message: 'Réservation annulée.' };
  }
  if (billet.e < jour) {
    return { verdict: 'EXPIRE', billet, message: `Billet expiré depuis le ${billet.e}.` };
  }
  if (billet.d !== jour) {
    return {
      verdict: 'MAUVAIS_JOUR',
      billet,
      message: `Billet daté du ${billet.d}, pas d'aujourd'hui.`,
    };
  }
  // Le paiement déclaré par le voyageur n'est pas un paiement vérifié : tant que le
  // système de la compagnie ne le confirme pas, l'agent doit encaisser au guichet.
  if (billet.p !== 'PAYEE' && billet.p !== 'CONFIRMEE' && billet.p !== 'EMBARQUE') {
    return { verdict: 'NON_PAYE', billet, message: 'Billet non payé — à régler au guichet.' };
  }

  return { verdict: 'VALIDE', billet, message: 'Billet valide.' };
}

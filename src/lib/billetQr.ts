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
import { billetEmis, paiementEtabli } from './parcours';
import type { Classe, Reservation, Voyageur } from '../types';

/** Préfixe de version : il permettra de faire évoluer le format sans casser l'ancien. */
const VERSION = 'SB1';

/**
 * Clé de signature — et la limite qu'il faut regarder en face.
 *
 * ## Une clé embarquée dans l'application est une clé publique
 *
 * Expo place toute variable `EXPO_PUBLIC_*` **en clair dans le paquet livré**. Elle
 * se lit dans le bundle web d'un simple `grep`, et dans un APK décompilé aussi
 * facilement. Vérifié sur l'export de ce projet : la clé par défaut y figure telle
 * quelle.
 *
 * La conséquence est directe, et elle a été reproduite : avec cette clé, on
 * fabrique en quelques lignes un billet VIP de 8 000 F que `verifierQrBillet` juge
 * **VALIDE**. Aucun outil particulier n'est nécessaire.
 *
 * ## Ce que la signature protège donc réellement
 *
 * Elle garantit l'**intégrité** — un QR abîmé, tronqué, recopié de travers ou
 * retouché à la main est refusé — et rien de plus. Elle ne prouve pas
 * l'**authenticité** : un faussaire qui a lu la clé produit un billet indiscernable
 * d'un vrai.
 *
 * Ce n'est pas un défaut réparable côté application : **aucune clé embarquée dans
 * un client ne peut l'être.** L'authenticité viendra de la compagnie, qui signera
 * ses billets avec une clé qui ne quitte jamais son système — c'est l'horizon 3.
 *
 * D'ici là, la seule chose honnête est de ne pas laisser croire le contraire à
 * l'agent qui contrôle : `SIGNATURE_DE_PROJET` le lui dit à l'écran, et le message
 * du verdict le dit aussi.
 */
const CLE_PAR_DEFAUT = 'siraba-cle-de-projet-v1';
const CLE = versOctets(process.env.EXPO_PUBLIC_CLE_BILLET ?? CLE_PAR_DEFAUT);

/**
 * Vrai tant que la compagnie n'a pas fourni sa propre clé.
 *
 * L'écran de contrôle s'en sert pour dire à l'agent ce que son scan prouve — et ce
 * qu'il ne prouve pas.
 */
export const SIGNATURE_DE_PROJET =
  (process.env.EXPO_PUBLIC_CLE_BILLET ?? CLE_PAR_DEFAUT) === CLE_PAR_DEFAUT;

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
  /**
   * État du **paiement** au moment de l'émission, et non le statut interne.
   *
   * Le statut brut y figurait auparavant, et le contrôleur devait deviner lesquels
   * des huit valaient paiement. Il acceptait ainsi `CONFIRMEE` — c'est-à-dire
   * « le voyageur a dit qu'il venait » — comme preuve d'encaissement.
   *
   * Le contrôleur n'a besoin que d'une chose à la porte du bus : est-ce payé ? Toute
   * autre valeur que `PAYE`, y compris une valeur inconnue venue d'une version
   * antérieure, est traitée comme impayée. La prudence va dans le bon sens : on
   * encaisse une fois de trop plutôt que de laisser monter sans payer.
   */
  p: 'PAYE' | 'DU';
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
    p: paiementEtabli(r) ? 'PAYE' : 'DU',
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

  /*
   * Il n'y a pas de contrôle d'annulation ici, et ce n'est pas un oubli.
   *
   * Un QR annulé ne peut pas exister : `construireQrBillet` refuse d'en produire un
   * pour une réservation annulée. Une annulation **postérieure** à l'affichage, en
   * revanche, ne peut pas être connue d'un code déjà imprimé ou capturé en
   * photo — c'est la limite d'une vérification hors ligne, et aucune signature ne
   * la lève. Seule la compagnie, reliée à son système, peut trancher ce cas ; le
   * verdict `ANNULE` reste donc dans la liste pour le jour où elle signera les
   * billets elle-même.
   */
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
  // système de la compagnie ne le constate pas, l'agent doit encaisser au guichet.
  // Toute valeur autre que « PAYE » — inconnue comprise — est traitée comme impayée.
  if (billet.p !== 'PAYE') {
    return { verdict: 'NON_PAYE', billet, message: 'Billet non payé — à régler au guichet.' };
  }

  /*
   * « Cohérent », et non « authentique ».
   *
   * Tant que la clé de signature est celle du projet, elle est lisible dans le
   * paquet livré : un billet fabriqué avec elle est indiscernable d'un vrai. Dire
   * « valide » sans nuance à l'agent l'inviterait à s'y fier plus que le code ne le
   * permet. Le verdict reste `VALIDE` — l'écran est bâti dessus — mais le message
   * dit ce qu'il vaut.
   */
  return {
    verdict: 'VALIDE',
    billet,
    message: SIGNATURE_DE_PROJET
      ? 'Billet cohérent et intact. Recoupez au guichet en cas de doute.'
      : 'Billet valide, signature de la compagnie vérifiée.',
  };
}

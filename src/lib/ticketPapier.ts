/**
 * Lire un ticket Saramaya en photo, et en tirer tout ce qu'il porte.
 *
 * Le code-barres du ticket ne donne qu'une chose : son numéro. Tout le reste — la
 * date, l'heure du départ, celle de la convocation, le tarif, le trajet, la classe —
 * restait à recopier à la main, six champs, sur un téléphone, à la gare. Autant dire
 * que personne ne le faisait.
 *
 * Le moteur de reconnaissance de caractères existe pourtant déjà dans
 * l'application : il sert à lire la CNIB. Ce module l'emploie sur le ticket.
 *
 *     photo du ticket → reconnaissance → **ici** → formulaire pré-rempli → confirmation
 *
 * ## Ce qu'on cherche, et comment on le reconnaît
 *
 * Un ticket n'a pas de format normalisé — contrairement à la bande d'une carte
 * d'identité, il n'y a ni positions fixes ni clés de contrôle. On ne peut donc rien
 * vérifier : on peut seulement **reconnaître des formes** et les proposer.
 *
 * D'où la règle qui gouverne ce module : **rien n'est affirmé, tout est proposé.**
 * Chaque champ trouvé pré-remplit une case que le voyageur relit. C'est exactement
 * ce que la compagnie écrit au dos de son propre ticket — « vérifiez l'heure et la
 * date dès réception, car nos agents peuvent se tromper ». Une machine aussi.
 *
 * Un champ non reconnu reste vide : jamais deviné, jamais rempli au hasard.
 */

import { VILLES } from '../data/reseau';
import type { Classe, Ville } from '../types';

export interface TicketLu {
  /** Numéro imprimé, tel quel. */
  numero?: string;
  /** AAAA-MM-JJ. */
  date?: string;
  /** HH:MM — l'heure du départ. */
  heure?: string;
  /** HH:MM — la convocation, quand le ticket la porte. */
  convocation?: string;
  /** Montant en francs CFA. */
  montant?: number;
  origine?: Ville;
  destination?: Ville;
  classe?: Classe;
  /** Ce qui a été reconnu, pour le dire à l'écran. */
  champsLus: string[];
}

/** Aplatit les accents et les séparateurs, sans changer la longueur des mots. */
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
}

/**
 * Les heures du ticket : départ et convocation.
 *
 * La convocation est **toujours antérieure** au départ — trente minutes chez
 * Saramaya. Quand le ticket porte deux heures sans les nommer, l'ordre suffit donc à
 * les distinguer, et c'est plus fiable que de chercher un libellé que la
 * reconnaissance aura peut-être écorché.
 */
function lireHeures(t: string): { heure?: string; convocation?: string } {
  const trouvees = [...t.matchAll(/\b([01]?\d|2[0-3])\s*[H:]\s*([0-5]\d)\b/g)]
    .map((m) => `${m[1]!.padStart(2, '0')}:${m[2]}`)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  if (trouvees.length === 0) return {};
  if (trouvees.length === 1) return { heure: trouvees[0] };
  // La plus tardive est le départ ; la plus proche avant elle, la convocation.
  const heure = trouvees[trouvees.length - 1]!;
  return { heure, convocation: trouvees[trouvees.length - 2] };
}

/**
 * Le montant, en francs.
 *
 * On exige la marque de la monnaie — « F », « FCFA », « CFA ». Sans elle, n'importe
 * quel nombre du ticket ferait un tarif : le numéro du ticket lui-même, une date,
 * un numéro de téléphone. Mieux vaut ne rien proposer que proposer un prix faux.
 */
function lireMontant(t: string): number | undefined {
  const m = t.match(/\b(\d{1,3}(?:[ . ]\d{3})+|\d{3,6})\s*(?:F\s*CFA|FCFA|CFA|F)\b/);
  if (!m) return undefined;
  const valeur = Number(m[1]!.replace(/[ . ]/g, ''));
  // Un trajet coûte entre quelques centaines et quelques dizaines de milliers.
  return valeur >= 200 && valeur <= 100000 ? valeur : undefined;
}

function lireDate(t: string): string | undefined {
  const m = t.match(/\b(\d{2})[/\-. ](\d{2})[/\-. ](\d{4})\b/);
  if (!m) return undefined;
  const [, jj, mm, aaaa] = m;
  const mois = Number(mm);
  const jour = Number(jj);
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return undefined;
  return `${aaaa}-${mm}-${jj}`;
}

/**
 * Le numéro du ticket.
 *
 * Quatre à six chiffres — celui du ticket de référence en portait cinq, 66456. On
 * écarte ce qui ressemble à autre chose : une année, une heure recollée, un montant
 * déjà reconnu.
 */
function lireNumero(t: string, montant?: number): string | undefined {
  /*
   * Le libellé exige son signe. Un simple « N » suivi d'un nombre ne suffit pas :
   * « EDITE EN 2026 » contient « N 2026 », et l'année devenait le numéro du ticket.
   * On réclame donc « N° », « No » ou « N : ».
   */
  const estAnnee = (n: string) => /^(19|20)\d{2}$/.test(n);
  const apresLibelle = t.match(/\bN\s*(?:[°ºO]\s*:?|:)\s*(\d{4,6})\b/);
  if (apresLibelle && !estAnnee(apresLibelle[1]!)) return apresLibelle[1];

  const candidats = [...t.matchAll(/\b(\d{4,6})\b/g)]
    .map((m) => m[1]!)
    .filter((n) => Number(n) !== montant)
    .filter((n) => !estAnnee(n));
  return candidats[0];
}

/** Les villes du réseau, dans l'ordre où elles apparaissent : origine puis destination. */
function lireTrajet(t: string): { origine?: Ville; destination?: Ville } {
  const rencontres = VILLES.map((ville) => ({ ville, position: t.indexOf(normaliser(ville)) }))
    .filter((r) => r.position >= 0)
    .sort((a, b) => a.position - b.position);

  if (rencontres.length === 0) return {};
  if (rencontres.length === 1) return { origine: rencontres[0]!.ville };
  return { origine: rencontres[0]!.ville, destination: rencontres[1]!.ville };
}

function lireClasse(t: string): Classe | undefined {
  if (/\bVIP\b/.test(t)) return /\bDIRECTE?\b/.test(t) ? 'VIP_DIRECTE' : 'VIP_1RE';
  if (/\bORDINAIRE\b|\bCLIMATISE\b/.test(t)) return 'ORDINAIRE';
  return undefined;
}

/**
 * Lit un ticket depuis le texte rendu par la reconnaissance de caractères.
 *
 * Ne lève jamais et n'invente jamais : les champs non reconnus restent absents, et
 * `champsLus` dit lesquels ont été trouvés — pour que l'écran puisse annoncer
 * « 4 champs lus, vérifiez-les » plutôt que de laisser croire à une lecture complète.
 */
export function lireTicketPapier(texte: string): TicketLu {
  const t = normaliser(texte);

  const montant = lireMontant(t);
  const { heure, convocation } = lireHeures(t);
  const { origine, destination } = lireTrajet(t);

  const lu: TicketLu = {
    ...(lireNumero(t, montant) ? { numero: lireNumero(t, montant) } : {}),
    ...(lireDate(t) ? { date: lireDate(t) } : {}),
    ...(heure ? { heure } : {}),
    ...(convocation ? { convocation } : {}),
    ...(montant !== undefined ? { montant } : {}),
    ...(origine ? { origine } : {}),
    ...(destination ? { destination } : {}),
    ...(lireClasse(t) ? { classe: lireClasse(t) } : {}),
    champsLus: [],
  };

  const noms: Record<string, string> = {
    numero: 'numéro',
    date: 'date',
    heure: 'heure de départ',
    convocation: 'convocation',
    montant: 'tarif',
    origine: 'ville de départ',
    destination: "ville d'arrivée",
    classe: 'classe',
  };
  lu.champsLus = Object.keys(noms).filter((c) => lu[c as keyof TicketLu] !== undefined).map((c) => noms[c]!);

  return lu;
}

/** Vrai quand la lecture apporte assez pour valoir la peine d'être proposée. */
export function ticketExploitable(lu: TicketLu): boolean {
  return lu.champsLus.length >= 2;
}

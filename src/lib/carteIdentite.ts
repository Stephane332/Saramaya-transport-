/**
 * Une carte lue, quelle que soit la face — et ce qu'on fait quand les deux faces
 * ne racontent pas la même histoire.
 *
 * La CNIB porte les mêmes informations à deux endroits : imprimées au recto, et
 * encodées dans la bande au dos. C'est une chance, et cette fusion en tire trois
 * choses que ni l'une ni l'autre ne donne seule.
 *
 * ## 1. La bande l'emporte, toujours
 *
 * Elle seule porte des clés de contrôle : une lecture fautive s'y détecte. Le
 * recto, lui, n'offre aucun moyen de savoir si un « 8 » était un « 0 ». Quand les
 * deux sont disponibles, le champ commun vient donc de la bande.
 *
 * ## 2. Le recto complète
 *
 * Il porte ce que la bande ne contient pas : le lieu de naissance, la date de
 * délivrance, la profession, la taille, et le numéro d'identification à dix-sept
 * chiffres imprimé en haut.
 *
 * ## 3. **Un désaccord est un signal, pas un détail**
 *
 * Si le recto annonce une expiration au 30/08/2031 et la bande au 30/08/2081, l'une
 * des deux lectures est fausse. Aucun système ne peut deviner laquelle — mais il
 * peut, et doit, **le dire**, et pointer le champ précis. C'est ce que fait
 * `desaccords`, et c'est ce que l'écran met en évidence.
 *
 * Sans cela, on aurait le pire des deux mondes : une valeur affichée avec l'aplomb
 * d'une donnée vérifiée, alors que deux sources la contredisent.
 */

import type { IdentiteLue } from './cnib';
import type { IdentiteRecto } from './cnibRecto';

export interface CarteIdentite {
  nom: string;
  prenoms: string;
  /** AAAA-MM-JJ. */
  dateNaissance: string;
  /** AAAA-MM-JJ. */
  dateExpiration: string;
  /** « B13654737 », tel qu'il figure sur la carte, sans espace. */
  numeroCarte: string;
  lieuNaissance: string;
  /** Les dix-sept chiffres imprimés en haut du recto. */
  numeroIdentification: string;
  sexe: '' | 'M' | 'F';
  profession: string;
  /** AAAA-MM-JJ. */
  dateDelivrance: string;
}

export type ChampCarte = keyof CarteIdentite;

/**
 * D'où vient la valeur affichée — ce que l'écran indique champ par champ.
 *
 * `SAISIE` désigne une valeur corrigée à la main : elle l'emporte sur toute
 * relecture ultérieure. Quelqu'un qui corrige une faute ne doit pas la voir
 * revenir parce qu'il a photographié l'autre face ensuite.
 */
export type SourceChamp = 'BANDE' | 'RECTO' | 'SAISIE' | 'AUCUNE';

export interface Fusion {
  carte: CarteIdentite;
  sources: Record<ChampCarte, SourceChamp>;
  /** Champs où recto et bande se contredisent : à vérifier en priorité. */
  desaccords: ChampCarte[];
  /** Avertissements des clés de contrôle de la bande. */
  avertissements: string[];
}

const CARTE_VIDE: CarteIdentite = {
  nom: '',
  prenoms: '',
  dateNaissance: '',
  dateExpiration: '',
  numeroCarte: '',
  lieuNaissance: '',
  numeroIdentification: '',
  sexe: '',
  profession: '',
  dateDelivrance: '',
};

const CHAMPS = Object.keys(CARTE_VIDE) as ChampCarte[];

/**
 * Compare deux valeurs d'un même champ en ignorant ce qui ne fait pas sens :
 * espaces, casse, accents. « Ange Stephane » et « ANGE STEPHANE » ne sont pas un
 * désaccord — signaler celui-là ferait perdre confiance dans les vrais.
 */
function memeValeur(a: string, b: string): boolean {
  const normaliser = (v: string) =>
    v
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  return normaliser(a) === normaliser(b);
}

export function fusionnerCarte(
  bande: IdentiteLue | null,
  recto: IdentiteRecto | null,
  avertissements: string[] = [],
): Fusion {
  const carte: CarteIdentite = { ...CARTE_VIDE };
  const sources = Object.fromEntries(CHAMPS.map((c) => [c, 'AUCUNE'])) as Record<
    ChampCarte,
    SourceChamp
  >;
  const desaccords: ChampCarte[] = [];

  /** Pose une valeur si elle est renseignée, sans écraser une source plus sûre. */
  const poser = (champ: ChampCarte, valeur: string | undefined, source: SourceChamp) => {
    if (!valeur) return;
    const actuelle = carte[champ];
    if (actuelle) {
      // Déjà rempli par la bande : on ne remplace pas, mais on note le désaccord.
      if (!memeValeur(actuelle, valeur) && !desaccords.includes(champ)) desaccords.push(champ);
      return;
    }
    (carte as Record<ChampCarte, string>)[champ] = valeur;
    sources[champ] = source;
  };

  // La bande d'abord : c'est elle qui fait foi sur les champs communs.
  if (bande) {
    poser('nom', bande.nom, 'BANDE');
    poser('prenoms', bande.prenoms, 'BANDE');
    poser('dateNaissance', bande.dateNaissance, 'BANDE');
    poser('dateExpiration', bande.dateExpiration, 'BANDE');
    poser('numeroCarte', bande.numero, 'BANDE');
    if (bande.sexe === 'M' || bande.sexe === 'F') poser('sexe', bande.sexe, 'BANDE');
  }

  // Le recto ensuite : il comble les vides et révèle les contradictions.
  if (recto) {
    poser('nom', recto.nom, 'RECTO');
    poser('prenoms', recto.prenoms, 'RECTO');
    poser('dateNaissance', recto.dateNaissance, 'RECTO');
    poser('dateExpiration', recto.dateExpiration, 'RECTO');
    poser('numeroCarte', recto.numeroCarte, 'RECTO');
    poser('sexe', recto.sexe, 'RECTO');
    poser('lieuNaissance', recto.lieuNaissance, 'RECTO');
    poser('numeroIdentification', recto.numeroIdentification, 'RECTO');
    poser('profession', recto.profession, 'RECTO');
    poser('dateDelivrance', recto.dateDelivrance, 'RECTO');
  }

  return { carte, sources, desaccords, avertissements };
}

/** Libellé affiché sous un champ pour dire d'où il vient. */
export function libelleSource(source: SourceChamp): string | null {
  switch (source) {
    case 'BANDE':
      return 'LU AU DOS · CLÉ DE CONTRÔLE VÉRIFIÉE';
    case 'RECTO':
      return 'LU AU RECTO · À VÉRIFIER';
    case 'SAISIE':
      return 'CORRIGÉ PAR VOUS';
    case 'AUCUNE':
      return null;
  }
}

/**
 * Reporte une fusion sur un formulaire déjà à l'écran.
 *
 * Une seule règle, et elle protège l'utilisateur : **ce qu'il a corrigé à la main
 * n'est jamais écrasé.** Photographier le dos après avoir rectifié une faute au
 * recto ne doit pas ramener la faute.
 */
export function appliquerFusion(
  actuel: CarteIdentite,
  sourcesActuelles: Record<ChampCarte, SourceChamp>,
  nouvelle: Fusion,
): { carte: CarteIdentite; sources: Record<ChampCarte, SourceChamp> } {
  const carte = { ...actuel };
  const sources = { ...sourcesActuelles };

  for (const champ of CHAMPS) {
    if (sourcesActuelles[champ] === 'SAISIE') continue;
    const valeur = nouvelle.carte[champ];
    if (!valeur) continue;
    (carte as Record<ChampCarte, string>)[champ] = valeur;
    sources[champ] = nouvelle.sources[champ];
  }

  return { carte, sources };
}

export { CARTE_VIDE, CHAMPS };

/** Champs indispensables à l'ouverture d'un compte. */
export function carteSuffisante(c: CarteIdentite): boolean {
  return c.nom.trim().length >= 2 && c.prenoms.trim().length >= 2;
}

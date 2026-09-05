/**
 * Identifiants et références.
 *
 * Deux exigences, et elles comptent toutes les deux :
 *
 * 1. **Aucune collision.** Un identifiant fondé sur `Date.now()` seul se répète
 *    si deux objets naissent dans la même milliseconde, et un identifiant fondé
 *    sur la longueur d'une liste se répète dès qu'un élément en sort. Deux
 *    réservations qui partagent un identifiant, c'est un billet qui en écrase un
 *    autre — donc une place perdue. On combine ici l'horodatage, un compteur de
 *    session et de l'aléatoire.
 *
 * 2. **Aucune confusion avec les références de la compagnie.** Le ticket papier
 *    porte un numéro à cinq chiffres émis par leur billetterie (66456 sur le
 *    ticket réel). Une référence produite ici ne doit jamais pouvoir passer pour
 *    l'une des leurs : un agent qui la recopierait dans Digiparc corromprait
 *    leur suivi. Nos références portent donc un préfixe qui les distingue au
 *    premier coup d'œil, et le resteront même une fois les systèmes reliés.
 */

/** Compteur de session : départage deux appels dans la même milliseconde. */
let compteur = 0;

const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans I ni O, illisibles à la main

function aleatoire(longueur: number): string {
  let sortie = '';
  for (let i = 0; i < longueur; i += 1) {
    sortie += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return sortie;
}

/**
 * Identifiant interne unique, jamais montré au voyageur.
 * Exemple : `res-m4x9k2p-0007-QF3T`.
 */
export function identifiant(prefixe: string): string {
  compteur += 1;
  const horodatage = Date.now().toString(36);
  const rang = compteur.toString().padStart(4, '0');
  return `${prefixe}-${horodatage}-${rang}-${aleatoire(4)}`;
}

/**
 * Référence lisible, affichée sur le billet et dictée au guichet.
 *
 * Le préfixe `SB` garantit qu'on ne la confondra jamais avec le numéro à cinq
 * chiffres de leur billetterie. Format : `SB-7K2Q4M`.
 *
 * Il vient du premier nom du projet et lui a survécu : le changer invaliderait
 * `estReferenceApplication` pour toutes les réservations déjà enregistrées, qui
 * cesseraient d'être reconnues comme nôtres. Deux lettres ne valent pas cela.
 */
export function referenceBillet(): string {
  return `SB-${aleatoire(6)}`;
}

/** Vrai si la référence a été émise par l'application (et non recopiée d'un ticket papier). */
export function estReferenceApplication(reference: string): boolean {
  return /^SB-[0-9A-Z]{6}$/.test(reference);
}

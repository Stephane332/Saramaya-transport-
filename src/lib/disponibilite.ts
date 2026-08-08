/**
 * Occupation des bus.
 *
 * Tant que le système de la compagnie n'est pas branché, le remplissage est
 * simulé de façon déterministe : un même départ affiche toujours le même plan,
 * ce qui rend la démonstration crédible et reproductible.
 */

import { nombreDeSieges } from '../data/reseau';
import type { Classe } from '../types';

export function siegesOccupes(departId: string, classe: Classe): number[] {
  const total = nombreDeSieges(classe);
  let graine = 0;
  for (let i = 0; i < departId.length; i++) {
    graine = (graine * 31 + departId.charCodeAt(i)) >>> 0;
  }
  const suivant = () => {
    graine = (graine * 1664525 + 1013904223) >>> 0;
    return graine / 0xffffffff;
  };
  const taux = 0.25 + suivant() * 0.5;
  const occupes = new Set<number>();
  const combien = Math.floor(total * taux);
  while (occupes.size < combien) {
    occupes.add(1 + Math.floor(suivant() * total));
  }
  return [...occupes].sort((a, b) => a - b);
}

export function identifiantDepart(
  ligneId: string,
  date: string,
  heure: string,
  classe: Classe,
): string {
  return `${ligneId}|${date}|${heure}|${classe}`;
}

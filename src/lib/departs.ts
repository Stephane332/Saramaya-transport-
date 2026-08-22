/**
 * Départs d'une journée — y compris ceux que la compagnie ajoute à la dernière minute.
 *
 * La grille publiée n'est pas la vérité complète. En période de forte affluence
 * (fêtes, rentrée, grands week-ends), Saramaya ajoute des départs qui ne figurent
 * nulle part : on les apprend en appelant la gare. Une application qui présenterait
 * sa liste comme exhaustive ferait donc manquer des bus à ses utilisateurs, et
 * passerait pour fausse le jour précis où elle est la plus utile.
 *
 * Trois principes, dans cet ordre :
 *
 * 1. **Les départs ajoutés sont de vraies données**, pas une invention : ils
 *    viennent du fichier d'état que la compagnie met à jour (même mécanisme que
 *    la suspension du service). Tant que personne ne l'alimente, il n'y en a
 *    aucun — on n'en fabrique pas.
 * 2. **La grille publiée n'est jamais présentée comme complète.** L'écran le dit
 *    et propose d'appeler la gare, avec le vrai numéro de la ligne.
 * 3. **Un ajout ne remplace jamais un départ publié** ayant la même heure : en cas
 *    de doublon, c'est la version de la compagnie qui l'emporte.
 */

import { departsAVenir } from './format';
import type { DepartHoraire } from '../types';
import type { DepartSupplementaire } from './statutService';

/** Un départ tel qu'affiché, en gardant trace de son origine. */
export interface DepartDuJour extends DepartHoraire {
  /** Vrai si le départ vient d'un ajout de la compagnie, absent de la grille publiée. */
  ajoute: boolean;
}

/**
 * Grille publiée + ajouts de la compagnie pour cette ligne et cette date, triés
 * par heure, et débarrassés de ceux qui sont déjà passés si la date est aujourd'hui.
 */
export function departsDuJour(
  publies: DepartHoraire[],
  ligneId: string,
  dateIso: string,
  supplementaires: DepartSupplementaire[] = [],
  maintenant = new Date(),
): DepartDuJour[] {
  const base: DepartDuJour[] = publies.map((d) => ({ ...d, ajoute: false }));
  const heuresPubliees = new Set(base.map((d) => d.heure));

  const ajouts: DepartDuJour[] = supplementaires
    .filter((s) => s.ligneId === ligneId && s.date === dateIso)
    // Un ajout qui doublonne un horaire publié est ignoré : pas deux fois le même bus.
    .filter((s) => !heuresPubliees.has(s.heure))
    .map((s) => ({ heure: s.heure, classe: s.classe, ajoute: true }));

  const tous = [...base, ...ajouts].sort((a, b) => a.heure.localeCompare(b.heure));
  return departsAVenir(tous, dateIso, maintenant);
}

/**
 * Exécuter une action de l'utilisateur sans rien perdre en cas d'échec.
 *
 * Onze actions du parcours — créer une réservation, ouvrir un compte, envoyer un
 * colis, enregistrer sa carte — étaient lancées sans filet. En développement cela ne
 * se voit pas ; en production, le réseau coupe, le stockage refuse d'écrire, une
 * permission est retirée, et il ne se passe **rien**. L'utilisateur retouche le
 * bouton, croit que ça n'a pas marché, recommence.
 *
 * Ce crochet règle les deux problèmes d'un coup :
 *
 * 1. **L'échec se voit.** Une erreur remonte en message lisible au lieu de
 *    disparaître dans la console.
 * 2. **Le double appui ne double rien.** Tant que l'action est en cours, un nouvel
 *    appui est ignoré. Sans cela, deux touches sur « Réserver » — réflexe courant sur
 *    un téléphone lent — créent deux réservations, donc deux places retenues et un
 *    voyageur qui paie deux fois ou occupe une place pour rien.
 */

import { useCallback, useRef, useState } from 'react';

export interface Action<T extends unknown[]> {
  /** Lance l'action. Ignore l'appel si la précédente n'est pas terminée. */
  lancer: (...args: T) => Promise<void>;
  /** Vrai pendant l'exécution : de quoi désactiver le bouton et montrer l'attente. */
  enCours: boolean;
  /** Message d'échec à afficher, ou null. */
  erreur: string | null;
  /** Efface le message, par exemple quand l'utilisateur corrige sa saisie. */
  effacerErreur: () => void;
}

export function useAction<T extends unknown[]>(
  operation: (...args: T) => Promise<unknown>,
  messageEchec: string,
): Action<T> {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  /*
   * Un verrou par référence, et non par état : `enCours` ne change qu'au rendu
   * suivant, si bien que deux appuis rapprochés passeraient tous les deux la garde.
   * La référence, elle, est à jour immédiatement.
   */
  const verrou = useRef(false);

  const lancer = useCallback(
    async (...args: T) => {
      if (verrou.current) return;
      verrou.current = true;
      setEnCours(true);
      setErreur(null);
      try {
        await operation(...args);
      } catch (e) {
        // Le message du code métier est plus utile que le nôtre quand il existe :
        // « Aucun compte : créez votre compte avant de scanner » vaut mieux qu'un
        // « une erreur est survenue » générique.
        const detail = e instanceof Error && e.message ? e.message : null;
        setErreur(detail ?? messageEchec);
      } finally {
        verrou.current = false;
        setEnCours(false);
      }
    },
    [operation, messageEchec],
  );

  return { lancer, enCours, erreur, effacerErreur: () => setErreur(null) };
}

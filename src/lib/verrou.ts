/**
 * Un verrou d'exécution : la même action ne part jamais deux fois de front.
 *
 * C'est la règle qui empêche deux appuis sur « Réserver » — réflexe courant sur un
 * téléphone lent, où rien ne bouge pendant une seconde — de retenir deux places,
 * d'importer deux fois le même ticket papier, ou de déclarer deux fois un paiement.
 *
 * Elle vit ici, séparée du crochet React qui l'utilise, pour une raison précise :
 * **c'est la garantie la plus importante de l'interface, et elle doit être
 * vérifiable sans téléphone ni simulateur.** `npm test` la contrôle à chaque
 * exécution ; un jour où quelqu'un la simplifiera de bonne foi, l'échec se verra.
 *
 * Trois propriétés, et le test les couvre toutes les trois :
 *
 * 1. Pendant qu'une exécution est en cours, toute autre est **ignorée** — et non
 *    mise en file, ce qui ne ferait que différer le doublon.
 * 2. Une fois terminée, l'action redevient disponible.
 * 3. **Une erreur libère le verrou.** Sans cela, un premier échec — réseau coupé —
 *    condamnerait le bouton pour le reste de la session.
 */

export interface Verrou {
  /** Vrai pendant l'exécution. */
  readonly occupe: boolean;
  /**
   * Lance l'opération si le verrou est libre.
   *
   * Renvoie `true` si elle a été lancée, `false` si l'appel a été ignoré. Les
   * erreurs de l'opération sont propagées : c'est à l'appelant de les afficher,
   * le verrou ne fait que garantir l'unicité.
   */
  executer(operation: () => Promise<unknown>): Promise<boolean>;
}

export function creerVerrou(): Verrou {
  let occupe = false;

  return {
    get occupe() {
      return occupe;
    },

    async executer(operation) {
      if (occupe) return false;
      occupe = true;
      try {
        await operation();
        return true;
      } finally {
        // `finally`, et non après le `await` : une opération qui échoue doit
        // rendre le bouton, sinon un seul échec le condamne définitivement.
        occupe = false;
      }
    },
  };
}

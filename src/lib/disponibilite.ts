/**
 * Ce qui marche aujourd'hui, ce qui attend la compagnie — et la bascule automatique.
 *
 * Certaines fonctions ne peuvent pas exister sans accès au système de Saramaya :
 * vérifier réellement un paiement, retrouver l'historique d'un ancien client,
 * afficher les places déjà prises. Deux mauvaises façons de traiter ça : les
 * simuler, ou les cacher. On fait ni l'un ni l'autre — elles sont visibles, marquées
 * **indisponibles pour le moment**, avec la raison.
 *
 * Et le jour de l'accord, rien n'est à réécrire : il suffit de renseigner l'adresse
 * du système et une clé. Tout ce qui était marqué indisponible s'allume, et la
 * synchronisation se déclenche seule.
 */

/**
 * Adresse du système de la compagnie. Vide tant que l'accès n'est pas accordé — et
 * c'est précisément ce vide qui pilote tout le reste de ce fichier.
 */
const URL_COMPAGNIE = process.env.EXPO_PUBLIC_DIGIPARC_URL ?? '';

/** Vrai dès que la compagnie a ouvert son système à l'application. */
export const RELIE_A_LA_COMPAGNIE = URL_COMPAGNIE.length > 0;

/** Les fonctions qui dépendent du système de la compagnie. */
export type Fonction =
  | 'PAIEMENT_VERIFIE'
  | 'HISTORIQUE_ANCIEN_CLIENT'
  | 'PLACES_OCCUPEES'
  | 'MANIFESTE_COMPLET'
  | 'CONFIRMATION_AUTOMATIQUE';

interface Etat {
  disponible: boolean;
  /** Ce que la fonction apportera — au présent, parce qu'elle existe, elle attend. */
  promesse: string;
  /** Pourquoi elle attend, en une phrase compréhensible par un non-technicien. */
  raison: string;
}

const ATTENTE: Record<Fonction, Omit<Etat, 'disponible'>> = {
  PAIEMENT_VERIFIE: {
    promesse: 'Votre paiement Orange Money constaté automatiquement, et le billet émis dans la foulée.',
    raison:
      "L'application ne voit pas les paiements reçus par la compagnie. En attendant, votre déclaration part à la gare, qui confirme.",
  },
  HISTORIQUE_ANCIEN_CLIENT: {
    promesse: 'Vos anciens voyages retrouvés automatiquement à partir de votre CNIB et de votre téléphone.',
    raison:
      "Votre historique existe dans le système de la compagnie, pas ici. En attendant, scannez vos anciens tickets : chacun rejoint votre historique.",
  },
  PLACES_OCCUPEES: {
    promesse: 'Les places déjà prises affichées en direct sur le plan du bus.',
    raison:
      "Seule la billetterie de la compagnie sait quelles places sont vendues. En attendant, indiquez la place que vous préférez : elle part avec votre demande.",
  },
  MANIFESTE_COMPLET: {
    promesse: 'La liste de tous les voyageurs d\'un départ, avec leur paiement en direct.',
    raison: "Sans système partagé, l'écran ne montre que les réservations de cet appareil.",
  },
  CONFIRMATION_AUTOMATIQUE: {
    promesse: 'La réponse du voyageur remonte seule à la gare — plus aucun appel de confirmation.',
    raison: 'La gare ne reçoit pas encore les réponses de l\'application. En attendant, elles partent par message pré-rempli.',
  },
};

export function etatFonction(f: Fonction): Etat {
  return { disponible: RELIE_A_LA_COMPAGNIE, ...ATTENTE[f] };
}

/**
 * Ce qu'il faut fournir pour tout allumer.
 *
 * Écrit ici plutôt que dans un document : c'est la liste exacte que le développeur
 * remplira le jour de l'accord, et elle doit vivre à côté du code qui la consomme.
 *
 *   EXPO_PUBLIC_DIGIPARC_URL  adresse du système de la compagnie
 *   DIGIPARC_JETON            jeton d'accès (jamais dans le code, jamais public)
 *   EXPO_PUBLIC_CLE_BILLET    clé de signature des billets, fournie par la compagnie
 *
 * Une fois ces valeurs en place :
 *   - `RELIE_A_LA_COMPAGNIE` devient vrai, et toutes les mentions « indisponible »
 *     disparaissent d'elles-mêmes des écrans ;
 *   - la couche `src/sync/` bascule de LocalProvider vers DigiparcProvider ;
 *   - la synchronisation se déclenche au lancement et à chaque retour au premier
 *     plan, sans intervention.
 */
export const CONFIGURATION_REQUISE = [
  'EXPO_PUBLIC_DIGIPARC_URL',
  'DIGIPARC_JETON',
  'EXPO_PUBLIC_CLE_BILLET',
] as const;

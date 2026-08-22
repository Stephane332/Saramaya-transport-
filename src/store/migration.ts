/**
 * Conversion du contenu enregistré d'une version à l'autre.
 *
 * C'est la fonction la plus dangereuse du projet : elle s'exécute une seule fois,
 * au premier démarrage après une mise à jour, sur les vraies données de quelqu'un.
 * Une erreur ici ne se rattrape pas — les voyages sont perdus, et personne ne les
 * a ailleurs, puisque rien n'est envoyé sur un serveur.
 *
 * Trois règles, dans cet ordre :
 *
 * 1. **On ne supprime jamais ce qu'on ne sait pas convertir.** Un champ inconnu
 *    est laissé tel quel ; un voyage de trop vaut mieux qu'un historique amputé.
 * 2. **On ne suppose rien de la forme reçue.** Un fichier tronqué doit donner un
 *    état vide exploitable, pas une exception au démarrage.
 * 3. **Chaque version a son test.** C'est pour cela que la fonction vit ici, à
 *    l'écart du magasin : elle est du calcul pur, donc vérifiable par `npm test`
 *    sans téléphone.
 */

import type { Caisse, Colis, Reservation, Voyageur } from '../types';

/**
 * Version de la forme des données enregistrées.
 *
 * 1 — forme d'origine (voyageur, réservations, colis, rappels).
 * 2 — ajout de la caisse ; les références produites par l'application passent au
 *     préfixe « SB- » pour ne plus ressembler aux numéros de la billetterie.
 * 3 — un colis naît « à déposer » et non « déposé » : `prepareLe` devient le
 *     moment de la préparation, `deposeLe` n'existe qu'après passage au guichet.
 */
export const SCHEMA_VERSION = 3;

/** La part de l'état qui est réellement enregistrée sur le téléphone. */
export interface EtatEnregistre {
  voyageur: Voyageur | null;
  reservations: Reservation[];
  colis: Colis[];
  rappelsProgrammes: Record<string, string[]>;
  caisse: Caisse | null;
}

/** Forme d'un colis avant la version 3 : déposé d'office, dès sa création. */
type ColisAncien = Colis & { prepareLe?: string; deposeLe?: string };

export function migrerEtat(
  enregistre: unknown,
  versionPrecedente: number,
): Partial<EtatEnregistre> {
  let etat = (enregistre ?? {}) as Partial<EtatEnregistre>;

  if (versionPrecedente < 2) {
    etat = {
      ...etat,
      reservations: Array.isArray(etat.reservations) ? etat.reservations : [],
      colis: Array.isArray(etat.colis) ? etat.colis : [],
      caisse: etat.caisse ?? null,
    };
  }

  if (versionPrecedente < 3) {
    /*
     * Les colis enregistrés avant cette version portaient tous `deposeLe`, posé à
     * la création — c'est-à-dire à la préparation, pas au dépôt. On récupère cette
     * date comme date de préparation et on rend le colis à son état réel : il
     * reste à déposer.
     *
     * Un colis déjà en route, arrivé ou retiré, lui, a forcément été remis au
     * guichet : on ne le fait pas reculer.
     */
    etat = {
      ...etat,
      colis: (Array.isArray(etat.colis) ? etat.colis : []).map((c) => {
        const ancien = c as ColisAncien;
        const prepareLe = ancien.prepareLe ?? ancien.deposeLe ?? new Date().toISOString();
        if (ancien.statut !== 'DEPOSE') return { ...ancien, prepareLe };
        const { deposeLe: _ignore, ...reste } = ancien;
        return { ...reste, prepareLe, statut: 'A_DEPOSER' as const };
      }),
    };
  }

  return etat;
}

/**
 * L'ordre des choses, et ce qui n'a pas le droit d'arriver.
 *
 * Une réservation traverse des étapes, et chacune ouvre certaines actions et en
 * ferme d'autres. Ces règles étaient jusqu'ici éparpillées dans les écrans, ce qui
 * avait laissé passer une incohérence sérieuse : **on obtenait un billet complet,
 * avec son QR, avant d'avoir payé**. Un billet non payé n'est pas un billet, c'est
 * une réservation en attente — et l'afficher comme un titre de transport trompe le
 * voyageur autant que l'agent.
 *
 * Tout est donc rassemblé ici, en un seul endroit vérifiable, et les écrans s'y
 * réfèrent au lieu de décider chacun dans leur coin.
 *
 * ## La règle centrale
 *
 * **Le billet n'est émis qu'une fois le paiement établi.** Établi veut dire : la
 * compagnie l'a constaté — au guichet, ou par son système. La déclaration du
 * voyageur (« j'ai payé par Orange Money ») ne suffit pas : l'application n'a aucun
 * moyen de la vérifier tant qu'elle n'est pas reliée à Digiparc. Elle est
 * enregistrée, transmise à la gare, mais elle ne fabrique pas un titre de transport.
 */

import type { Reservation } from '../types';

/**
 * Où en est une réservation, du point de vue du voyageur.
 *
 * Volontairement plus grossier que `StatutReservation` : ce sont les cinq états que
 * l'interface doit distinguer, pas les huit du modèle métier.
 */
export type Etape =
  | 'A_PAYER'
  | 'PAIEMENT_DECLARE'
  | 'BILLET_EMIS'
  | 'VOYAGE_EFFECTUE'
  | 'ANNULEE';

export function etapeReservation(r: Reservation): Etape {
  if (r.statut === 'ANNULEE') return 'ANNULEE';
  if (r.statut === 'EMBARQUE' || r.statut === 'NO_SHOW') return 'VOYAGE_EFFECTUE';
  if (r.statut === 'PAYEE' || r.statut === 'CONFIRMEE') return 'BILLET_EMIS';
  return r.paiementDeclareLe ? 'PAIEMENT_DECLARE' : 'A_PAYER';
}

/**
 * Le billet existe-t-il ?
 *
 * C'est la garde qui empêche l'application de délivrer un titre de transport avant
 * paiement. Un paiement seulement déclaré ne compte pas : le voyageur peut se
 * tromper de montant, viser le mauvais numéro, ou simplement ne pas avoir payé.
 */
export function billetEmis(r: Reservation): boolean {
  const etape = etapeReservation(r);
  return etape === 'BILLET_EMIS' || etape === 'VOYAGE_EFFECTUE';
}

/** Ce que le voyageur peut faire à cette étape. */
export interface ActionsPossibles {
  /** Afficher un QR présentable au contrôleur. */
  afficherBillet: boolean;
  /** Déclarer avoir payé par mobile money. */
  declarerPaiement: boolean;
  /** Annuler, pour libérer la place. */
  annuler: boolean;
  /** Reporter sur un autre départ, dans la validité de trente jours. */
  reporter: boolean;
  /** Revenir sur une annulation. */
  reprendre: boolean;
}

export function actionsPossibles(r: Reservation): ActionsPossibles {
  switch (etapeReservation(r)) {
    case 'A_PAYER':
      return {
        afficherBillet: false,
        declarerPaiement: true,
        annuler: true,
        reporter: true,
        reprendre: false,
      };
    case 'PAIEMENT_DECLARE':
      // La déclaration est faite : la répéter n'apporterait rien et laisserait croire
      // qu'elle n'a pas été prise en compte.
      return {
        afficherBillet: false,
        declarerPaiement: false,
        annuler: true,
        reporter: true,
        reprendre: false,
      };
    case 'BILLET_EMIS':
      return {
        afficherBillet: true,
        declarerPaiement: false,
        annuler: true,
        reporter: true,
        reprendre: false,
      };
    case 'VOYAGE_EFFECTUE':
      // Un voyage passé ne se modifie plus. Le billet reste consultable : il fait
      // partie de l'historique, et sert de preuve.
      return {
        afficherBillet: true,
        declarerPaiement: false,
        annuler: false,
        reporter: false,
        reprendre: false,
      };
    case 'ANNULEE':
      return {
        afficherBillet: false,
        declarerPaiement: false,
        annuler: false,
        reporter: false,
        reprendre: true,
      };
  }
}

/** Titre et explication de l'étape, tels qu'ils s'affichent au voyageur. */
export function libelleEtape(r: Reservation): { titre: string; explication: string } {
  switch (etapeReservation(r)) {
    case 'A_PAYER':
      return {
        titre: 'Place retenue — à payer',
        explication:
          "Votre place est retenue, mais le billet n'est pas encore émis : il le sera une fois le paiement constaté par la gare. Payez par Orange Money aux coordonnées ci-dessous, ou au guichet.",
      };
    case 'PAIEMENT_DECLARE':
      return {
        titre: 'Paiement déclaré',
        explication:
          "Votre déclaration est enregistrée et part avec la demande à la gare. Le billet sera émis dès que la compagnie aura constaté le paiement. L'application ne peut pas le vérifier elle-même tant qu'elle n'est pas reliée à leur système.",
      };
    case 'BILLET_EMIS':
      return {
        titre: 'Billet valide',
        explication:
          'Présentez ce code à la porte du bus. Il fonctionne sans réseau.',
      };
    case 'VOYAGE_EFFECTUE':
      return { titre: 'Voyage effectué', explication: 'Ce billet fait partie de votre historique.' };
    case 'ANNULEE':
      return {
        titre: 'Réservation annulée',
        explication: 'La place a été libérée. Vous pouvez revenir sur cette annulation.',
      };
  }
}

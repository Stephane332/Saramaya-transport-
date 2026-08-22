/**
 * Politique d'annulation et de report.
 *
 * Le ticket papier porte deux mentions qui, mises côte à côte, dictent toute la
 * logique : « Ticket non remboursable » et « valide pour 30 jours ».
 *
 * Autrement dit, la bonne réponse à un empêchement n'est presque jamais le
 * remboursement : c'est le REPORT sur un autre départ dans la fenêtre de validité.
 * Aucun argent ne sort de la caisse, le voyageur ne perd rien, et aucun agent n'a
 * de dossier à traiter. Le remboursement devient l'exception.
 */

import { differenceInHours, parseISO } from 'date-fns';
import type { PolitiqueAnnulation, Reservation } from '../types';
import { dateHeureConvocation, dateHeureDepart } from './confirmation';
import { paiementEtabli } from './parcours';

/** Seuil au-delà duquel un remboursement intégral reste envisageable. */
const HEURES_REMBOURSEMENT_INTEGRAL = 24;

/** Part remboursée entre ce seuil et la convocation. */
const TAUX_REMBOURSEMENT_PARTIEL = 0.5;

export function politiqueAnnulation(
  r: Reservation,
  maintenant: Date = new Date(),
): PolitiqueAnnulation {
  const depart = dateHeureDepart(r);
  const convocation = dateHeureConvocation(r);
  const heuresAvant = differenceInHours(depart, maintenant);
  const billetEncoreValide = maintenant < parseISO(r.expireLe);

  /*
   * Rien n'a été payé : il n'y a rien à rembourser, et rien à traiter en caisse.
   *
   * La garde ne peut pas se contenter du statut `OPTION`. Une réservation impayée
   * dont le voyageur a confirmé la venue passe en `CONFIRMEE`, sortait donc de ce
   * cas, et repartait avec un remboursement à verser en caisse pour un billet
   * jamais réglé. C'est le paiement qui décide, pas le statut.
   */
  if (!paiementEtabli(r)) {
    return {
      peutReporter: true,
      remboursement: 'AUCUN',
      montantRembourse: 0,
      actionAgentRequise: false,
      motif: "Réservation non payée : la place est simplement remise en vente.",
      recommandation: 'REPORTER',
    };
  }

  // Après la convocation : le billet reste utilisable dans ses 30 jours.
  if (maintenant >= convocation) {
    return {
      peutReporter: billetEncoreValide,
      remboursement: 'AUCUN',
      montantRembourse: 0,
      actionAgentRequise: false,
      motif: billetEncoreValide
        ? `Passé la convocation, le ticket n'est pas remboursable, mais il reste valide jusqu'au ${formatJour(r.expireLe)} : reportez-le sur un autre départ.`
        : "Le ticket a dépassé sa validité de 30 jours.",
      recommandation: 'REPORTER',
    };
  }

  // Plus de 24 h avant : le report est gratuit, le remboursement reste possible.
  if (heuresAvant >= HEURES_REMBOURSEMENT_INTEGRAL) {
    return {
      peutReporter: true,
      remboursement: 'INTEGRAL',
      montantRembourse: r.montant,
      actionAgentRequise: true,
      motif: `Plus de ${HEURES_REMBOURSEMENT_INTEGRAL} h avant le départ : report gratuit, ou remboursement intégral à retirer en caisse.`,
      recommandation: 'REPORTER',
    };
  }

  // Dernières heures : le report reste gratuit, le remboursement devient partiel.
  return {
    peutReporter: true,
    remboursement: 'PARTIEL',
    montantRembourse: Math.round((r.montant * TAUX_REMBOURSEMENT_PARTIEL) / 100) * 100,
    actionAgentRequise: true,
    motif: `À moins de ${HEURES_REMBOURSEMENT_INTEGRAL} h du départ, le remboursement est partiel — mais le report sur un autre départ reste gratuit.`,
    recommandation: 'REPORTER',
  };
}

/**
 * Ce que l'agent voit dans sa liste « à traiter » : soit rien, soit un montant
 * précis à sortir de la caisse. C'est tout ce qui lui reste à faire.
 */
export function actionCaisse(
  r: Reservation,
  maintenant: Date = new Date(),
): { aFaire: boolean; libelle: string; montant: number } {
  const p = politiqueAnnulation(r, maintenant);
  if (!p.actionAgentRequise || p.montantRembourse === 0) {
    return { aFaire: false, libelle: 'Rien à traiter', montant: 0 };
  }
  return {
    aFaire: true,
    libelle:
      p.remboursement === 'INTEGRAL'
        ? 'Remboursement intégral'
        : 'Remboursement partiel',
    montant: p.montantRembourse,
  };
}

function formatJour(iso: string): string {
  const d = parseISO(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
}

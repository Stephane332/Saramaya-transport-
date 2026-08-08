/**
 * Jeu de démonstration.
 *
 * Le premier voyage de l'historique est le ticket papier réel qui a servi de point
 * de départ au projet : Ouahigouya → Ouagadougou, 3 500 F, siège 93, n° 66456.
 * Les dates sont calculées par rapport à aujourd'hui pour que la démonstration
 * reste vivante quel que soit le jour où on l'ouvre.
 */

import { addDays, addMinutes, format, subDays } from 'date-fns';
import { JOURS_VALIDITE, LIGNES, MINUTES_CONVOCATION } from './reseau';
import type { Reservation, Voyageur } from '../types';
import { decalerHeure } from '../lib/format';

export const VOYAGEUR_DEMO: Voyageur = {
  id: 'voyageur-1',
  nom: 'SAWADOGO',
  prenom: 'Ange',
  telephone: '66798031',
  cnib: 'B 1234567',
};

const jour = (d: Date) => format(d, 'yyyy-MM-dd');

interface Brouillon {
  reference: string;
  ligneId: string;
  gareDepartId: string;
  dateOffsetJours: number;
  heure: string;
  classe: 'CLASSIQUE' | 'VIP';
  siege: number | null;
  montant: number;
  statut: Reservation['statut'];
  moyenPaiement?: Reservation['moyenPaiement'];
  supports: Reservation['supports'];
  importeDuPapier?: boolean;
  /**
   * Cale la réservation sur le prochain horaire réel de la ligne situé à plus de
   * `minutesMinimum` d'ici — l'heure reste crédible, et la démonstration de la
   * confirmation reste vivante quel que soit le moment où on ouvre l'application.
   */
  prochainHoraireReel?: { minutesMinimum: number };
}

/** Prochain départ réel de la ligne, aujourd'hui ou demain. */
function prochainDepartReel(
  ligneId: string,
  minutesMinimum: number,
  maintenant: Date,
): { date: string; heure: string } {
  const horaires = LIGNES.find((l) => l.id === ligneId)?.horaires ?? ['16:00'];
  const seuil = addMinutes(maintenant, minutesMinimum);

  for (const h of horaires) {
    const [hh, mm] = h.split(':').map(Number);
    const candidat = new Date(maintenant);
    candidat.setHours(hh, mm, 0, 0);
    if (candidat >= seuil) return { date: jour(candidat), heure: h };
  }
  // Plus rien aujourd'hui : premier départ de demain.
  return { date: jour(addDays(maintenant, 1)), heure: horaires[0] };
}

const BROUILLONS: Brouillon[] = [
  // ─── À venir ────────────────────────────────────────────────────────────────
  // Réservation non payée dont l'échéance approche : c'est elle qui déclenche
  // l'escalade de confirmation et l'alarme.
  {
    reference: '66891',
    ligneId: 'ligne-ouahigouya-ouaga',
    gareDepartId: 'gare-ouahigouya',
    dateOffsetJours: 0,
    heure: '16:00',
    classe: 'VIP',
    siege: 12,
    montant: 5000,
    statut: 'OPTION',
    supports: ['NUMERIQUE'],
    prochainHoraireReel: { minutesMinimum: 75 },
  },
  // Billet payé pour la semaine prochaine : protégé, jamais annulable par minuteur.
  {
    reference: '66903',
    ligneId: 'ligne-ouaga-bobo',
    gareDepartId: 'gare-ouaga-gounghin',
    dateOffsetJours: 6,
    heure: '08:30',
    classe: 'VIP',
    siege: 4,
    montant: 8000,
    statut: 'PAYEE',
    moyenPaiement: 'ORANGE_MONEY',
    supports: ['NUMERIQUE'],
  },

  // ─── Historique ─────────────────────────────────────────────────────────────
  // Le ticket papier réel, importé par scan du code-barres.
  {
    reference: '66456',
    ligneId: 'ligne-ouahigouya-ouaga',
    gareDepartId: 'gare-ouahigouya',
    dateOffsetJours: -2,
    heure: '16:00',
    classe: 'CLASSIQUE',
    siege: 93,
    montant: 3500,
    statut: 'EMBARQUE',
    moyenPaiement: 'ESPECES_GUICHET',
    supports: ['PAPIER', 'NUMERIQUE'],
    importeDuPapier: true,
  },
  {
    reference: '65210',
    ligneId: 'ligne-ouaga-ouahigouya',
    gareDepartId: 'gare-ouaga-tampouy',
    dateOffsetJours: -16,
    heure: '10:00',
    classe: 'CLASSIQUE',
    siege: 41,
    montant: 3500,
    statut: 'EMBARQUE',
    moyenPaiement: 'ORANGE_MONEY',
    supports: ['NUMERIQUE'],
  },
  {
    reference: '64877',
    ligneId: 'ligne-ouaga-bobo',
    gareDepartId: 'gare-ouaga-gounghin',
    dateOffsetJours: -34,
    heure: '14:30',
    classe: 'VIP',
    siege: 7,
    montant: 8000,
    statut: 'EMBARQUE',
    moyenPaiement: 'ORANGE_MONEY',
    supports: ['NUMERIQUE'],
  },
  {
    reference: '64102',
    ligneId: 'ligne-bobo-ouaga',
    gareDepartId: 'gare-bobo-tounouma',
    dateOffsetJours: -38,
    heure: '22:30',
    classe: 'VIP',
    siege: 9,
    montant: 8000,
    statut: 'EMBARQUE',
    moyenPaiement: 'ORANGE_MONEY',
    supports: ['NUMERIQUE'],
  },
  // Un voyage annulé à temps : la place est repartie à la liste d'attente.
  {
    reference: '63744',
    ligneId: 'ligne-ouahigouya-ouaga',
    gareDepartId: 'gare-ouahigouya',
    dateOffsetJours: -52,
    heure: '06:00',
    classe: 'CLASSIQUE',
    siege: 28,
    montant: 3500,
    statut: 'ANNULEE',
    moyenPaiement: 'ORANGE_MONEY',
    supports: ['NUMERIQUE'],
  },
  {
    reference: '62998',
    ligneId: 'ligne-ouaga-koudougou',
    gareDepartId: 'gare-ouaga-tampouy',
    dateOffsetJours: -67,
    heure: '11:00',
    classe: 'CLASSIQUE',
    siege: 15,
    montant: 2500,
    statut: 'EMBARQUE',
    moyenPaiement: 'ESPECES_GUICHET',
    supports: ['PAPIER'],
    importeDuPapier: true,
  },
  {
    reference: '61455',
    ligneId: 'ligne-ouahigouya-ouaga',
    gareDepartId: 'gare-ouahigouya',
    dateOffsetJours: -91,
    heure: '14:00',
    classe: 'CLASSIQUE',
    siege: 52,
    montant: 3500,
    statut: 'EMBARQUE',
    moyenPaiement: 'ESPECES_GUICHET',
    supports: ['PAPIER'],
    importeDuPapier: true,
  },
];

export function construireReservations(maintenant: Date = new Date()): Reservation[] {
  return BROUILLONS.map((b, index) => {
    let date: string;
    let heure = b.heure;

    if (b.prochainHoraireReel) {
      const prochain = prochainDepartReel(
        b.ligneId,
        b.prochainHoraireReel.minutesMinimum,
        maintenant,
      );
      date = prochain.date;
      heure = prochain.heure;
    } else {
      const d =
        b.dateOffsetJours >= 0
          ? addDays(maintenant, b.dateOffsetJours)
          : subDays(maintenant, -b.dateOffsetJours);
      date = jour(d);
    }

    const creeLe =
      b.dateOffsetJours >= 0
        ? subDays(maintenant, 1).toISOString()
        : subDays(maintenant, -b.dateOffsetJours + 1).toISOString();

    return {
      id: `res-${index + 1}`,
      reference: b.reference,
      voyageurId: VOYAGEUR_DEMO.id,
      ligneId: b.ligneId,
      gareDepartId: b.gareDepartId,
      date,
      heure,
      convocation: decalerHeure(heure, -MINUTES_CONVOCATION),
      classe: b.classe,
      siege: b.siege,
      montant: b.montant,
      statut: b.statut,
      moyenPaiement: b.moyenPaiement,
      supports: b.supports,
      creeLe,
      payeLe: b.statut === 'OPTION' ? undefined : creeLe,
      annuleLe: b.statut === 'ANNULEE' ? creeLe : undefined,
      expireLe: addDays(new Date(creeLe), JOURS_VALIDITE).toISOString(),
      importeDuPapier: b.importeDuPapier,
    } satisfies Reservation;
  });
}

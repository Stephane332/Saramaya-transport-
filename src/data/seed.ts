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
import type { Classe, Colis, Reservation, Voyageur } from '../types';
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
  classe: Classe;
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
): { date: string; heure: string; classe: Classe } {
  const departs = LIGNES.find((l) => l.id === ligneId)?.departs ?? [];
  const seuil = addMinutes(maintenant, minutesMinimum);

  for (const d of departs) {
    const [hh, mm] = d.heure.split(':').map(Number);
    const candidat = new Date(maintenant);
    candidat.setHours(hh, mm, 0, 0);
    if (candidat >= seuil) return { date: jour(candidat), heure: d.heure, classe: d.classe };
  }
  // Plus rien aujourd'hui : premier départ de demain.
  const premier = departs[0];
  return { date: jour(addDays(maintenant, 1)), heure: premier.heure, classe: premier.classe };
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
    classe: 'VIP_1RE',
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
    classe: 'VIP_1RE',
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
    classe: 'ORDINAIRE',
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
    classe: 'ORDINAIRE',
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
    classe: 'VIP_1RE',
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
    classe: 'VIP_1RE',
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
    classe: 'ORDINAIRE',
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
    classe: 'ORDINAIRE',
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
    classe: 'ORDINAIRE',
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
    let classe = b.classe;

    if (b.prochainHoraireReel) {
      const prochain = prochainDepartReel(
        b.ligneId,
        b.prochainHoraireReel.minutesMinimum,
        maintenant,
      );
      date = prochain.date;
      heure = prochain.heure;
      // La classe est celle du départ retenu, pas celle du brouillon.
      classe = prochain.classe;
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
      classe,
      siege: b.siege,
      montant: LIGNES.find((l) => l.id === b.ligneId)?.tarifs[classe] ?? b.montant,
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

/**
 * Colis de démonstration : un en cours de route, un arrivé qui attend son
 * destinataire, et un déjà retiré.
 */
export function construireColis(maintenant: Date = new Date()): Colis[] {
  const il_y_a = (heures: number) =>
    new Date(maintenant.getTime() - heures * 3600000).toISOString();

  return [
    {
      id: 'colis-1',
      reference: 'C-48120',
      codeRetrait: 'KRD-729',
      expediteurId: VOYAGEUR_DEMO.id,
      destinataireNom: 'OUEDRAOGO Fatimata',
      destinataireTelephone: '70451288',
      gareDepartId: 'gare-ouahigouya',
      gareArriveeId: 'gare-ouaga-gounghin',
      taille: 'PETIT',
      description: 'Documents et vêtements',
      valeurDeclaree: 25000,
      montant: 2500,
      statut: 'EN_TRANSIT',
      deposeLe: il_y_a(3),
      codePartage: true,
      moyenPaiement: 'ORANGE_MONEY',
    },
    {
      id: 'colis-2',
      reference: 'C-47903',
      codeRetrait: 'TQM-486',
      expediteurId: VOYAGEUR_DEMO.id,
      destinataireNom: 'KABORE Boukary',
      destinataireTelephone: '76330914',
      gareDepartId: 'gare-ouaga-gounghin',
      gareArriveeId: 'gare-bobo-tounouma',
      taille: 'MOYEN',
      description: 'Carton de pièces détachées',
      valeurDeclaree: 120000,
      montant: 7000,
      statut: 'ARRIVE',
      deposeLe: il_y_a(30),
      arriveLe: il_y_a(24),
      codePartage: true,
      moyenPaiement: 'ORANGE_MONEY',
    },
    {
      id: 'colis-3',
      reference: 'C-46551',
      codeRetrait: 'BXN-234',
      expediteurId: VOYAGEUR_DEMO.id,
      destinataireNom: 'ZONGO Issouf',
      destinataireTelephone: '65817402',
      gareDepartId: 'gare-ouaga-tampouy',
      gareArriveeId: 'gare-ouahigouya',
      taille: 'ENVELOPPE',
      description: 'Dossier administratif',
      valeurDeclaree: 0,
      montant: 1000,
      statut: 'RETIRE',
      deposeLe: il_y_a(24 * 12),
      arriveLe: il_y_a(24 * 12 - 4),
      retireLe: il_y_a(24 * 11),
      codePartage: true,
      moyenPaiement: 'ESPECES_GUICHET',
    },
  ];
}

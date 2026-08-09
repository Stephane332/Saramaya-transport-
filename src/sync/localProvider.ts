/**
 * Horizon 1 — tout se passe sur le téléphone.
 *
 * Aucune donnée ne sort, aucune autorisation n'est nécessaire. La réservation est
 * préparée localement puis transmise à la gare par un appel ou un message
 * entièrement pré-rempli : l'agent n'a plus qu'à saisir, au lieu de tout demander.
 */

import { addDays, addMinutes, format, parseISO } from 'date-fns';
import {
  JOURS_VALIDITE,
  LIBELLES_CLASSE,
  MINUTES_CONVOCATION,
  identifiantDepart,
  ligneParId,
  nombreDeSieges,
} from '../data/reseau';
import { decalerHeure } from '../lib/format';
import type { Classe, Reservation, Voyageur } from '../types';
import type {
  DemandeReservation,
  DepartDisponible,
  ResultatSynchro,
  SyncProvider,
  TicketScanne,
} from './types';

export class LocalProvider implements SyncProvider {
  readonly nom = 'Appareil';
  readonly horizon = 1 as const;
  readonly description =
    "Vos données restent sur votre téléphone. La demande part à la gare par appel ou message pré-rempli.";

  private reservations: Reservation[];
  private onChange: (r: Reservation[]) => void;

  constructor(initiales: Reservation[], onChange: (r: Reservation[]) => void) {
    this.reservations = initiales;
    this.onChange = onChange;
  }

  remplacer(reservations: Reservation[]) {
    this.reservations = reservations;
  }

  private valider(mutation: (r: Reservation) => Reservation, id: string): ResultatSynchro {
    let modifiee: Reservation | undefined;
    this.reservations = this.reservations.map((r) => {
      if (r.id !== id) return r;
      modifiee = mutation(r);
      return modifiee;
    });
    this.onChange(this.reservations);
    if (!modifiee) throw new Error(`Réservation introuvable : ${id}`);
    return {
      transmise: false,
      actionRestante: "À transmettre à la gare depuis l'écran du billet.",
      reservation: modifiee,
    };
  }

  async chercherDeparts({
    ligneId,
    date,
    classe,
  }: {
    ligneId: string;
    date: string;
    classe?: Classe;
  }): Promise<DepartDisponible[]> {
    const ligne = ligneParId(ligneId);
    if (!ligne) return [];

    // La classe n'est pas un choix : elle est attachée au départ.
    return ligne.departs
      .filter((d) => !classe || d.classe === classe)
      .map((d) => {
        const id = identifiantDepart(ligneId, date, d.heure, d.classe);
        return {
          id,
          ligneId,
          gareDepartId: '',
          date,
          heure: d.heure,
          convocation: decalerHeure(d.heure, -MINUTES_CONVOCATION),
          classe: d.classe,
          tarif: ligne.tarifs[d.classe],
          placesTotal: nombreDeSieges(d.classe),
          // Horizon 1 : l'application ne connaît pas la disponibilité réelle.
          placesLibres: null,
          siegesOccupes: null,
        } satisfies DepartDisponible;
      });
  }

  async historique(voyageurId: string): Promise<Reservation[]> {
    return this.reservations
      .filter((r) => r.voyageurId === voyageurId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  async creerReservation(d: DemandeReservation): Promise<ResultatSynchro> {
    const maintenant = new Date();
    const reservation: Reservation = {
      id: `res-${Date.now()}`,
      reference: String(66900 + (this.reservations.length + 7) * 13).slice(0, 5),
      voyageurId: d.voyageurId,
      ligneId: d.ligneId,
      gareDepartId: d.gareDepartId,
      date: d.date,
      heure: d.heure,
      convocation: decalerHeure(d.heure, -MINUTES_CONVOCATION),
      classe: d.classe,
      siege: d.siege,
      montant: d.montant,
      statut: 'OPTION',
      supports: ['NUMERIQUE'],
      creeLe: maintenant.toISOString(),
      expireLe: addDays(maintenant, JOURS_VALIDITE).toISOString(),
    };
    this.reservations = [reservation, ...this.reservations];
    this.onChange(this.reservations);
    return {
      transmise: false,
      actionRestante:
        "Envoyez la demande à la gare : l'appel et le message sont déjà remplis.",
      reservation,
    };
  }

  async confirmerPresence(id: string) {
    return this.valider(
      (r) => ({ ...r, statut: 'CONFIRMEE', confirmeLe: new Date().toISOString() }),
      id,
    );
  }

  async annuler(id: string) {
    return this.valider(
      (r) => ({ ...r, statut: 'ANNULEE', annuleLe: new Date().toISOString() }),
      id,
    );
  }

  async reporter(id: string, nouveau: { date: string; heure: string }) {
    return this.valider(
      (r) => ({
        ...r,
        date: nouveau.date,
        heure: nouveau.heure,
        convocation: decalerHeure(nouveau.heure, -MINUTES_CONVOCATION),
        statut: r.payeLe ? 'PAYEE' : 'OPTION',
        confirmeLe: undefined,
        annuleLe: undefined,
      }),
      id,
    );
  }

  async enregistrerPaiement(id: string, moyen: Reservation['moyenPaiement']) {
    return this.valider(
      (r) => ({ ...r, statut: 'PAYEE', payeLe: new Date().toISOString(), moyenPaiement: moyen }),
      id,
    );
  }

  async importerTicketPapier(t: TicketScanne, voyageur: Voyageur): Promise<Reservation> {
    const maintenant = new Date();
    const date = t.date ?? format(maintenant, 'yyyy-MM-dd');
    const heure = t.heure ?? '16:00';
    const reservation: Reservation = {
      id: `res-papier-${Date.now()}`,
      reference: t.reference,
      voyageurId: voyageur.id,
      ligneId: t.ligneId ?? 'ligne-ouahigouya-ouaga',
      gareDepartId: 'gare-ouahigouya',
      date,
      heure,
      convocation: decalerHeure(heure, -MINUTES_CONVOCATION),
      classe: t.classe ?? 'ORDINAIRE',
      siege: t.siege ?? null,
      montant: t.montant ?? 0,
      statut: parseISO(`${date}T${heure}:00`) < maintenant ? 'EMBARQUE' : 'PAYEE',
      moyenPaiement: 'ESPECES_GUICHET',
      supports: ['PAPIER', 'NUMERIQUE'],
      creeLe: maintenant.toISOString(),
      payeLe: maintenant.toISOString(),
      expireLe: t.expireLe ?? addDays(parseISO(`${date}T${heure}:00`), JOURS_VALIDITE).toISOString(),
      importeDuPapier: true,
    };
    this.reservations = [reservation, ...this.reservations];
    this.onChange(this.reservations);
    return reservation;
  }
}

/**
 * Message pré-rempli pour la gare. C'est le « pont manuel » de l'horizon 1 : tout
 * ce que l'agent doit saisir tient dans un SMS que le voyageur envoie en un geste.
 */
export function messagePourLaGare(r: Reservation, voyageur: Voyageur): string {
  const ligne = ligneParId(r.ligneId);
  const trajet = ligne ? `${ligne.origine} - ${ligne.destination}` : r.ligneId;
  return [
    `Réservation Saramaya`,
    `Trajet : ${trajet}`,
    `Date : ${format(parseISO(r.date), 'dd/MM/yyyy')}`,
    `Départ : ${r.heure} (convocation ${r.convocation})`,
    `Classe : ${LIBELLES_CLASSE[r.classe]}`,
    r.siege ? `Siège souhaité : ${r.siege}` : null,
    `Tarif : ${r.montant} F`,
    `Nom : ${voyageur.nom} ${voyageur.prenom}`,
    `Contact : ${voyageur.telephone}`,
    voyageur.cnib ? `CNIB : ${voyageur.cnib}` : null,
    `Réf. application : ${r.reference}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Heure de départ effective depuis une gare donnée, décalage compris. */
export function heureDepuisGare(heure: string, decalageMinutes: number): string {
  return format(addMinutes(parseISO(`2000-01-01T${heure}:00`), decalageMinutes), 'HH:mm');
}

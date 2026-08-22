/**
 * EXEMPLE — implémentation Digiparc du SyncProvider (Horizon 3).
 *
 * Ce fichier n'est pas compilé par l'application : c'est un modèle, placé dans la
 * documentation. Le jour où Digiparc ouvre un accès API pour le compte
 * `saramaya-transport`, on le recopie dans `src/sync/digiparcProvider.ts`, on le
 * complète avec la vraie forme des réponses (donnée par leur documentation), et on
 * bascule le fournisseur dans le store — sans toucher à un seul écran.
 *
 * Les appels reproduisent ceux observés dans l'espace client public de la
 * compagnie : un point d'entrée générique `/api/generic`, piloté par trois
 * en-têtes (Authorization, societecode, entity).
 */

import type {
  DemandeReservation,
  DepartDisponible,
  ResultatSynchro,
  SyncProvider,
  TicketScanne,
} from '../../src/sync/types';
import type { Reservation, Voyageur } from '../../src/types';

interface ConfigDigiparc {
  /** https://cloud.digiparc.com */
  baseUrl: string;
  /** Le code de la compagnie : "saramaya-transport". */
  societeCode: string;
  /** Jeton Bearer fourni par Digiparc. JAMAIS écrit en dur — variable d'environnement. */
  jeton: string;
}

const ENTITE_RESERVATION = 'billeterie-reservation-siteweb';
const ENTITE_BILLET = 'billeterie-billet-vsm-siteweb';

export class DigiparcProvider implements SyncProvider {
  readonly nom = 'Digiparc';
  readonly horizon = 3 as const;
  readonly description =
    'Synchronisation directe avec la billetterie de la compagnie.';

  constructor(private config: ConfigDigiparc) {}

  private entetes(entite: string): Record<string, string> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.jeton}`,
      societecode: this.config.societeCode,
      entity: entite,
    };
  }

  async chercherDeparts({
    date,
  }: {
    ligneId: string;
    date: string;
  }): Promise<DepartDisponible[]> {
    const listParams = {
      dateDepart: `${date}T00:00:00.000Z`,
      billeterieAgenceId: 'null',
    };
    const params = new URLSearchParams({ listParams: JSON.stringify(listParams) });

    const res = await fetch(
      `${this.config.baseUrl}/api/generic/getListByParams?${params.toString()}`,
      { method: 'GET', headers: this.entetes(ENTITE_RESERVATION) },
    );
    const data = await res.json();

    // TODO — mapper la forme réelle de la réponse (donnée par la doc Digiparc)
    // vers DepartDisponible. La structure ci-dessous est une hypothèse.
    return (data.list ?? []).map((d: Record<string, unknown>) => mapperDepart(d));
  }

  async creerReservation(demande: DemandeReservation): Promise<ResultatSynchro> {
    const corps = {
      societeCode: this.config.societeCode,
      gareDepartId: demande.gareDepartId,
      dateDepart: `${demande.date}T00:00:00.000Z`,
      nombrePlaces: 1,
      passagers: [{ siege: demande.siege }],
      montantTtc: demande.montant,
      // … champs complémentaires selon la doc officielle.
    };

    const res = await fetch(`${this.config.baseUrl}/api/generic`, {
      method: 'POST',
      headers: this.entetes(ENTITE_BILLET),
      body: JSON.stringify(corps),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || data.message || 'Réservation refusée par Digiparc');
    }

    const data = await res.json();
    return {
      transmise: true, // Cette fois, la compagnie a REÇU la réservation.
      reservation: mapperReservation(data),
    };
  }

  async historique(voyageurId: string): Promise<Reservation[]> {
    // GET getListByParams filtré sur le téléphone du voyageur.
    void voyageurId;
    throw new Error('À implémenter avec la doc Digiparc.');
  }

  async confirmerPresence(): Promise<ResultatSynchro> {
    throw new Error('À implémenter : mise à jour du statut via POST /api/generic.');
  }
  async annuler(): Promise<ResultatSynchro> {
    throw new Error('À implémenter.');
  }
  async reporter(): Promise<ResultatSynchro> {
    throw new Error('À implémenter.');
  }
  async enregistrerPaiement(): Promise<ResultatSynchro> {
    // Le maillon manquant : rapprocher le paiement Orange Money dans Digiparc.
    throw new Error('À implémenter — c\'est ici que les appels de confirmation disparaissent.');
  }
  async importerTicketPapier(t: TicketScanne, voyageur: Voyageur): Promise<Reservation> {
    void t;
    void voyageur;
    throw new Error('Le scan reste local ; pas besoin de Digiparc pour importer un papier.');
  }
}

/* Correspondances à compléter avec la vraie forme des réponses. */
function mapperDepart(_d: Record<string, unknown>): DepartDisponible {
  throw new Error('mapperDepart : à compléter avec la doc Digiparc.');
}
function mapperReservation(_d: unknown): Reservation {
  throw new Error('mapperReservation : à compléter avec la doc Digiparc.');
}

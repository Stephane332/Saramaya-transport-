import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { VOYAGEUR_DEMO, construireReservations } from '../data/seed';
import { LocalProvider } from '../sync/localProvider';
import type { DemandeReservation, TicketScanne } from '../sync/types';
import type { Reservation, Voyageur } from '../types';

interface EtatApp {
  voyageur: Voyageur | null;
  reservations: Reservation[];
  /** Rappels déjà joués, par réservation — pour ne jamais répéter une étape. */
  rappelsJoues: Record<string, string[]>;
  /** Réservations dont la place a été réattribuée : la rétractation n'est plus possible. */
  placesReattribuees: string[];
  amorce: boolean;

  amorcer: () => void;
  definirVoyageur: (v: Voyageur) => void;
  reinitialiser: () => void;

  creer: (d: DemandeReservation) => Promise<Reservation>;
  confirmer: (id: string) => Promise<void>;
  annuler: (id: string) => Promise<void>;
  reprendre: (id: string) => Promise<void>;
  reporter: (id: string, nouveau: { date: string; heure: string }) => Promise<void>;
  payer: (id: string, moyen: Reservation['moyenPaiement']) => Promise<void>;
  importerPapier: (t: TicketScanne) => Promise<Reservation>;
  marquerRappelJoue: (id: string, etapeId: string) => void;
}

function provider(get: () => EtatApp, set: (p: Partial<EtatApp>) => void) {
  return new LocalProvider(get().reservations, (reservations) => set({ reservations }));
}

export const useApp = create<EtatApp>()(
  persist(
    (set, get) => ({
      voyageur: null,
      reservations: [],
      rappelsJoues: {},
      placesReattribuees: [],
      amorce: false,

      amorcer: () => {
        if (get().amorce) return;
        set({
          voyageur: VOYAGEUR_DEMO,
          reservations: construireReservations(),
          amorce: true,
        });
      },

      definirVoyageur: (voyageur) => set({ voyageur }),

      reinitialiser: () =>
        set({
          voyageur: VOYAGEUR_DEMO,
          reservations: construireReservations(),
          rappelsJoues: {},
          placesReattribuees: [],
          amorce: true,
        }),

      creer: async (d) => {
        const p = provider(get, set);
        const { reservation } = await p.creerReservation(d);
        return reservation;
      },

      confirmer: async (id) => {
        await provider(get, set).confirmerPresence(id);
      },

      annuler: async (id) => {
        await provider(get, set).annuler(id);
      },

      /** Rétractation : on remet la réservation dans l'état où elle était. */
      reprendre: async (id) => {
        set({
          reservations: get().reservations.map((r) =>
            r.id === id
              ? { ...r, statut: r.payeLe ? 'PAYEE' : 'OPTION', annuleLe: undefined }
              : r,
          ),
        });
      },

      reporter: async (id, nouveau) => {
        await provider(get, set).reporter(id, nouveau);
      },

      payer: async (id, moyen) => {
        await provider(get, set).enregistrerPaiement(id, moyen);
      },

      importerPapier: async (t) => {
        const voyageur = get().voyageur ?? VOYAGEUR_DEMO;
        return provider(get, set).importerTicketPapier(t, voyageur);
      },

      marquerRappelJoue: (id, etapeId) => {
        const actuels = get().rappelsJoues[id] ?? [];
        if (actuels.includes(etapeId)) return;
        set({ rappelsJoues: { ...get().rappelsJoues, [id]: [...actuels, etapeId] } });
      },
    }),
    {
      name: 'saramaya-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        voyageur: s.voyageur,
        reservations: s.reservations,
        rappelsJoues: s.rappelsJoues,
        placesReattribuees: s.placesReattribuees,
        amorce: s.amorce,
      }),
    },
  ),
);

/** Prochain voyage à venir, celui qui pilote l'accueil et les rappels. */
export function prochainVoyage(reservations: Reservation[], maintenant = new Date()): Reservation | null {
  const aVenir = reservations
    .filter((r) => !['ANNULEE', 'EMBARQUE', 'NO_SHOW', 'REPORTEE'].includes(r.statut))
    .filter((r) => new Date(`${r.date}T${r.heure}:00`) >= maintenant)
    .sort(
      (a, b) =>
        new Date(`${a.date}T${a.heure}:00`).getTime() -
        new Date(`${b.date}T${b.heure}:00`).getTime(),
    );
  return aVenir[0] ?? null;
}

export function voyagesEffectues(reservations: Reservation[]): Reservation[] {
  return reservations.filter((r) => r.statut === 'EMBARQUE');
}

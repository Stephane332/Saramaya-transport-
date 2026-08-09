import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { LocalProvider } from '../sync/localProvider';
import type { DemandeReservation, TicketScanne } from '../sync/types';
import { genererCodeRetrait } from '../lib/colis';
import type { Caisse, Colis, Reservation, TailleColis, Voyageur } from '../types';

/**
 * État de l'application.
 *
 * Rien n'est pré-rempli : un nouveau client arrive sur une application vide, crée
 * son compte, puis construit son historique en s'en servant vraiment — en scannant
 * ses tickets papier et en réservant. Aucune donnée fictive.
 */

export interface DemandeColis {
  destinataireNom: string;
  destinataireTelephone: string;
  gareDepartId: string;
  gareArriveeId: string;
  taille: TailleColis;
  description: string;
  valeurDeclaree: number;
  montant: number;
}

interface EtatApp {
  /** Null tant que le compte n'a pas été créé : c'est ce qui déclenche l'accueil. */
  voyageur: Voyageur | null;
  reservations: Reservation[];
  colis: Colis[];
  /** Rappels déjà programmés, par réservation — pour ne pas les reprogrammer en double. */
  rappelsProgrammes: Record<string, string[]>;
  /** Configuration de la caisse, côté agent. Null pour un voyageur ordinaire. */
  caisse: Caisse | null;

  creerCompte: (v: Omit<Voyageur, 'id'>) => void;
  mettreAJourProfil: (champs: Partial<Voyageur>) => void;
  supprimerCompte: () => void;

  creer: (d: DemandeReservation) => Promise<Reservation>;
  confirmer: (id: string) => Promise<void>;
  annuler: (id: string) => Promise<void>;
  reprendre: (id: string) => Promise<void>;
  reporter: (id: string, nouveau: { date: string; heure: string }) => Promise<void>;
  marquerPaiementDeclare: (id: string, moyen: Reservation['moyenPaiement']) => Promise<void>;
  importerPapier: (t: TicketScanne) => Promise<Reservation>;

  envoyerColis: (d: DemandeColis, moyen: Colis['moyenPaiement']) => Promise<Colis>;
  marquerCodePartage: (id: string) => void;

  marquerRappelProgramme: (id: string, etapeId: string) => void;

  definirCaisse: (c: Caisse) => void;
  effacerCaisse: () => void;
}

function provider(get: () => EtatApp, set: (p: Partial<EtatApp>) => void) {
  return new LocalProvider(get().reservations, (reservations) => set({ reservations }));
}

export const useApp = create<EtatApp>()(
  persist(
    (set, get) => ({
      voyageur: null,
      reservations: [],
      colis: [],
      rappelsProgrammes: {},
      caisse: null,

      creerCompte: (v) => {
        set({ voyageur: { ...v, id: `v-${Date.now()}` } });
      },

      mettreAJourProfil: (champs) => {
        const actuel = get().voyageur;
        if (!actuel) return;
        set({ voyageur: { ...actuel, ...champs } });
      },

      supprimerCompte: () =>
        set({ voyageur: null, reservations: [], colis: [], rappelsProgrammes: {} }),

      creer: async (d) => {
        const { reservation } = await provider(get, set).creerReservation(d);
        return reservation;
      },

      confirmer: async (id) => {
        await provider(get, set).confirmerPresence(id);
      },

      annuler: async (id) => {
        await provider(get, set).annuler(id);
      },

      /** Rétractation : on remet la réservation dans son état précédent. */
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

      /**
       * Le voyageur déclare avoir payé par mobile money. Ce n'est pas une
       * confirmation de paiement — l'application ne peut pas la vérifier sans le
       * système de la compagnie. La réservation reste « à confirmer au guichet ».
       */
      marquerPaiementDeclare: async (id, moyen) => {
        set({
          reservations: get().reservations.map((r) =>
            r.id === id ? { ...r, moyenPaiement: moyen, paiementDeclareLe: new Date().toISOString() } : r,
          ),
        });
      },

      importerPapier: async (t) => {
        const voyageur = get().voyageur;
        if (!voyageur) throw new Error('Aucun compte : créez votre compte avant de scanner.');
        return provider(get, set).importerTicketPapier(t, voyageur);
      },

      envoyerColis: async (d, moyen) => {
        const voyageur = get().voyageur;
        if (!voyageur) throw new Error('Aucun compte.');
        const maintenant = new Date();
        const colis: Colis = {
          id: `colis-${Date.now()}`,
          reference: `C-${Date.now().toString().slice(-6)}`,
          codeRetrait: genererCodeRetrait(),
          expediteurId: voyageur.id,
          ...d,
          statut: 'DEPOSE',
          deposeLe: maintenant.toISOString(),
          codePartage: false,
          moyenPaiement: moyen,
        };
        set({ colis: [colis, ...get().colis] });
        return colis;
      },

      marquerCodePartage: (id) =>
        set({
          colis: get().colis.map((c) => (c.id === id ? { ...c, codePartage: true } : c)),
        }),

      marquerRappelProgramme: (id, etapeId) => {
        const actuels = get().rappelsProgrammes[id] ?? [];
        if (actuels.includes(etapeId)) return;
        set({ rappelsProgrammes: { ...get().rappelsProgrammes, [id]: [...actuels, etapeId] } });
      },

      definirCaisse: (c) => set({ caisse: c }),
      effacerCaisse: () => set({ caisse: null }),
    }),
    {
      name: 'saramaya-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        voyageur: s.voyageur,
        reservations: s.reservations,
        colis: s.colis,
        rappelsProgrammes: s.rappelsProgrammes,
        caisse: s.caisse,
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

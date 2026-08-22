import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { LocalProvider } from '../sync/localProvider';
import type { DemandeReservation, TicketScanne } from '../sync/types';
import { genererCodeRetrait } from '../lib/colis';
import { identifiant, referenceBillet } from '../lib/identifiants';
import { SCHEMA_VERSION, migrerEtat } from './migration';
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

  /**
   * Faux tant que le contenu enregistré n'a pas été relu depuis le téléphone.
   *
   * Sans ce drapeau, l'application voit `voyageur: null` pendant la fraction de
   * seconde que dure la relecture, et renvoie un client déjà inscrit vers
   * l'ouverture de compte — où il recréerait un compte par-dessus le sien. Rien
   * ne doit être décidé sur l'état du compte avant que ceci soit vrai.
   */
  charge: boolean;
  /** Renseigné si la relecture a échoué : on prévient au lieu de faire comme si c'était vide. */
  erreurChargement: string | null;

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
  marquerColisDepose: (id: string, codeGuichet?: string) => Promise<void>;
  marquerCodePartage: (id: string) => void;

  marquerRappelProgramme: (id: string, etapeId: string) => void;

  definirCaisse: (c: Caisse) => void;
  effacerCaisse: () => void;
}

function provider(get: () => EtatApp, set: (p: Partial<EtatApp>) => void) {
  return new LocalProvider(get().reservations, (reservations) => set({ reservations }));
}

/**
 * Filet contre un démarrage qui ne finit jamais.
 *
 * L'écran de lancement attend `charge`, et `charge` attend `onRehydrateStorage`.
 * Zustand appelle ce rappel dans les deux cas, succès comme échec — sauf si la
 * promesse du stockage ne se résout **jamais**. Cela arrive : un AsyncStorage
 * bloqué sous Android suffit, et l'application resterait alors indéfiniment sur le
 * kangourou, sans message et sans issue.
 *
 * Au bout de huit secondes — largement au-delà d'une relecture normale, qui prend
 * quelques dizaines de millisecondes — on débloque, et l'application affiche
 * l'écran prévu pour ce cas : « ne recréez pas de compte, redémarrez ». C'est le
 * même écran que pour une lecture ratée, parce que la consigne est la même, et
 * qu'elle est bien plus utile qu'un logo figé.
 */
const DELAI_RELECTURE_MS = 8000;

const LECTURE_IMPOSSIBLE =
  "Vos données enregistrées n'ont pas pu être relues. Ne recréez pas de compte : redémarrez l'application, elles sont probablement intactes.";

/*
 * Déclaré avant le magasin, et non après : `onRehydrateStorage` peut se déclencher
 * pendant la création du magasin si le stockage répond immédiatement. Une constante
 * définie plus bas serait alors dans sa zone morte, et l'annulation du minuteur
 * ferait tomber le démarrage — l'exact contraire du but de ce filet.
 */
let minuteurRelecture: ReturnType<typeof setTimeout> | undefined;

function armerFiletRelecture() {
  minuteurRelecture = setTimeout(() => {
    if (useApp.getState().charge) return;
    useApp.setState({ charge: true, erreurChargement: LECTURE_IMPOSSIBLE });
  }, DELAI_RELECTURE_MS);

  /*
   * Sous Node — et donc dans les tests — un minuteur en attente garderait le
   * processus en vie. `unref` existe sur Node, pas dans React Native : on ne
   * l'appelle que s'il est là.
   */
  (minuteurRelecture as unknown as { unref?: () => void }).unref?.();
}

export const useApp = create<EtatApp>()(
  persist(
    (set, get) => ({
      voyageur: null,
      reservations: [],
      colis: [],
      rappelsProgrammes: {},
      caisse: null,
      charge: false,
      erreurChargement: null,

      creerCompte: (v) => {
        // Garde-fou : on ne recouvre jamais un compte existant par inadvertance.
        if (get().voyageur) return;
        set({ voyageur: { ...v, id: identifiant('v') } });
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

      /**
       * Prépare un envoi. Ne dépose rien et ne paie rien : le colis attend d'être
       * remis au guichet, où il sera enregistré et réglé. `moyenPaiement` est le
       * mode choisi d'avance, pas un règlement constaté.
       */
      envoyerColis: async (d, moyen) => {
        const voyageur = get().voyageur;
        if (!voyageur) throw new Error('Créez votre compte avant de préparer un envoi.');
        const colis: Colis = {
          id: identifiant('colis'),
          reference: referenceBillet(),
          codeRetrait: genererCodeRetrait(),
          expediteurId: voyageur.id,
          ...d,
          statut: 'A_DEPOSER',
          prepareLe: new Date().toISOString(),
          codePartage: false,
          moyenPaiement: moyen,
        };
        set({ colis: [colis, ...get().colis] });
        return colis;
      },

      /**
       * L'expéditeur revient du guichet : le colis est remis et réglé.
       *
       * C'est lui qui le déclare, faute de lien avec le système de la compagnie —
       * et c'est le guichet qui fait foi pour le code. S'il en a remis un autre,
       * c'est celui-là qu'on garde : le destinataire présentera celui du guichet,
       * pas celui de l'application.
       */
      marquerColisDepose: async (id, codeGuichet) => {
        const code = codeGuichet?.trim().toUpperCase();
        const maintenant = new Date().toISOString();
        set({
          colis: get().colis.map((c) =>
            c.id === id
              ? {
                  ...c,
                  statut: 'DEPOSE',
                  deposeLe: maintenant,
                  regleLe: maintenant,
                  ...(code ? { codeRetrait: code, codeDuGuichet: true } : {}),
                }
              : c,
          ),
        });
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

      /**
       * Version du contenu enregistré. À incrémenter dès que la forme des données
       * change, en ajoutant la conversion correspondante dans `migrate`. C'est ce
       * qui garantit qu'une mise à jour de l'application ne fait perdre à personne
       * ses voyages : on convertit l'ancien contenu, on ne le jette pas.
       */
      version: SCHEMA_VERSION,
      migrate: migrerEtat,

      partialize: (s) => ({
        voyageur: s.voyageur,
        reservations: s.reservations,
        colis: s.colis,
        rappelsProgrammes: s.rappelsProgrammes,
        caisse: s.caisse,
      }),

      /**
       * Fusion explicite. La fusion par défaut de zustand est superficielle : un
       * champ absent de l'enregistrement écraserait sa valeur par défaut par
       * `undefined`. On reconstruit donc l'état à la main, en se rabattant sur les
       * valeurs par défaut pour tout ce qui manque, et en refusant les types
       * inattendus — un fichier tronqué ne doit pas faire planter le démarrage.
       */
      merge: (enregistre, actuel) => {
        const e = (enregistre ?? {}) as Partial<EtatApp>;
        return {
          ...actuel,
          voyageur: e.voyageur ?? null,
          reservations: Array.isArray(e.reservations) ? e.reservations : [],
          colis: Array.isArray(e.colis) ? e.colis : [],
          rappelsProgrammes:
            e.rappelsProgrammes && typeof e.rappelsProgrammes === 'object'
              ? e.rappelsProgrammes
              : {},
          caisse: e.caisse ?? null,
        };
      },

      /**
       * Fin de relecture. Deux cas, et aucun ne doit ressembler à « compte vide » :
       * si la lecture échoue, on le dit ; si elle réussit, on lève le drapeau qui
       * autorise enfin l'application à décider où envoyer le client.
       */
      onRehydrateStorage: () => (_etat, erreur) => {
        if (minuteurRelecture !== undefined) clearTimeout(minuteurRelecture);
        useApp.setState({
          charge: true,
          erreurChargement: erreur ? LECTURE_IMPOSSIBLE : null,
        });
      },
    },
  ),
);

// Le filet n'est armé qu'une fois le magasin construit : si la relecture a déjà
// abouti pendant sa création, il n'y a plus rien à surveiller.
if (!useApp.getState().charge) armerFiletRelecture();

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

/**
 * État du service — le coupe-circuit contrôlé par la compagnie.
 *
 * La compagnie doit pouvoir suspendre les réservations à distance (incident, jour
 * férié, maintenance) et informer les voyageurs, puis rouvrir quand elle le
 * décide. Ce mécanisme est réel, pas simulé :
 *
 *   - L'application interroge un petit fichier d'état hébergé par la compagnie,
 *     à l'adresse EXPO_PUBLIC_STATUT_URL. Format attendu :
 *         { "ouvert": false, "message": "Service suspendu jusqu'à 14h." }
 *   - Tant que cette adresse n'est pas configurée, ou si elle est injoignable,
 *     l'application considère le service OUVERT (fail-open) : on ne bloque jamais
 *     un voyageur à cause d'un souci technique de notre côté.
 *
 * Il suffit donc à la compagnie d'héberger un fichier de trois lignes pour piloter
 * l'ouverture — bien plus léger qu'un serveur, et déjà branché ici.
 */

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { Classe } from '../types';

/**
 * Un départ ajouté par la compagnie en dehors de la grille publiée — typiquement
 * en période de forte affluence. Déclaré dans le même fichier d'état.
 */
export interface DepartSupplementaire {
  ligneId: string;
  /** Date ISO du jour concerné (AAAA-MM-JJ) : un ajout vaut pour un jour précis. */
  date: string;
  heure: string;
  classe: Classe;
}

export interface StatutService {
  ouvert: boolean;
  message?: string;
  /** Départs ajoutés par la compagnie, hors grille publiée. Vide par défaut. */
  departsSupplementaires: DepartSupplementaire[];
  /** Renseigné quand l'état vient réellement de la compagnie (et non du défaut). */
  source: 'compagnie' | 'defaut';
}

const URL_STATUT = process.env.EXPO_PUBLIC_STATUT_URL;
const OUVERT_PAR_DEFAUT: StatutService = {
  ouvert: true,
  departsSupplementaires: [],
  source: 'defaut',
};

const CLASSES: Classe[] = ['ORDINAIRE', 'VIP_1RE', 'VIP_DIRECTE'];

/**
 * Ne retient que les départs correctement formés.
 *
 * Le fichier est édité à la main par la compagnie : une faute de frappe ne doit
 * pas faire apparaître un bus fantôme, ni faire planter l'écran de réservation.
 * Ce qui n'est pas exploitable est écarté en silence.
 */
function departsValides(brut: unknown): DepartSupplementaire[] {
  if (!Array.isArray(brut)) return [];
  return brut.filter((d): d is DepartSupplementaire => {
    if (!d || typeof d !== 'object') return false;
    const c = d as Record<string, unknown>;
    return (
      typeof c.ligneId === 'string' &&
      typeof c.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(c.date) &&
      typeof c.heure === 'string' &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(c.heure) &&
      typeof c.classe === 'string' &&
      CLASSES.includes(c.classe as Classe)
    );
  });
}

/** Interroge une fois le fichier d'état. Ne lève jamais : renvoie le défaut en cas d'échec. */
export async function lireStatutService(): Promise<StatutService> {
  if (!URL_STATUT) return OUVERT_PAR_DEFAUT;
  try {
    const reponse = await fetch(`${URL_STATUT}?t=${Date.now()}`, { cache: 'no-store' });
    if (!reponse.ok) return OUVERT_PAR_DEFAUT;
    const data = await reponse.json();
    return {
      ouvert: data.ouvert !== false,
      message: typeof data.message === 'string' ? data.message : undefined,
      departsSupplementaires: departsValides(data.departsSupplementaires),
      source: 'compagnie',
    };
  } catch {
    return OUVERT_PAR_DEFAUT;
  }
}

/**
 * Suit l'état du service : au montage, à chaque retour au premier plan, et toutes
 * les cinq minutes. C'est ce qui permet à une suspension décidée par la compagnie
 * d'apparaître rapidement chez le voyageur, et à une réouverture de le débloquer.
 */
export function useStatutService(): StatutService {
  const [statut, setStatut] = useState<StatutService>(OUVERT_PAR_DEFAUT);

  useEffect(() => {
    let actif = true;
    const rafraichir = async () => {
      const s = await lireStatutService();
      if (actif) setStatut(s);
    };

    rafraichir();
    const minuteur = setInterval(rafraichir, 5 * 60 * 1000);
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') rafraichir();
    });

    return () => {
      actif = false;
      clearInterval(minuteur);
      abonnement.remove();
    };
  }, []);

  return statut;
}

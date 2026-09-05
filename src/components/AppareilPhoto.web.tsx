/**
 * L'appareil photo sur le web : absent, et surtout **pas importé**.
 *
 * Ce fichier ne fait rien, et c'est exactement son rôle. Ce qui compte est ce qu'il
 * ne contient pas : aucune mention d'`expo-camera`. Le module de la caméra, sur le
 * web, lance à l'import un *worker* qui va chercher un script de lecture de QR sur
 * un CDN extérieur — un contact réseau vers un tiers, à chaque chargement de page,
 * qu'aucun écran n'avait demandé.
 *
 * Le bundler substitue cette variante à `AppareilPhoto.tsx` pour la cible web, si
 * bien que le module n'entre jamais dans le bundle et que le contact n'a pas lieu.
 * C'est ce qui rend vraie la phrase de la politique de confidentialité : trois
 * choses seulement quittent l'appareil, et elles y sont toutes les trois nommées.
 *
 * La version web reste entièrement utilisable : partout où l'appareil sert, la
 * saisie manuelle donne le même résultat par le même chemin — la bande du dos de la
 * CNIB se recopie, et le numéro d'un ticket se tape.
 */

import { forwardRef, useImperativeHandle } from 'react';
import type { CommandeAppareil, PermissionAppareil } from './AppareilPhoto';

export const APPAREIL_DISPONIBLE = false;

export type { CommandeAppareil, PermissionAppareil };

export function usePermissionAppareil(): PermissionAppareil {
  return { accordee: false, demander: async () => false };
}

export const VueAppareil = forwardRef<CommandeAppareil>(function VueAppareil(_props, reference) {
  useImperativeHandle(reference, () => ({ prendre: async () => null }));
  return null;
});

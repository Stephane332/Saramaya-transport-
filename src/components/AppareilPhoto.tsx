/**
 * L'appareil photo, isolé derrière une frontière de plateforme.
 *
 * ## Pourquoi ce fichier existe
 *
 * `expo-camera`, sur le web, ne se contente pas d'être inerte : à l'**import** du
 * module — pas à l'affichage d'une caméra, à l'import — il crée un *worker* qui
 * exécute `importScripts('https://cdn.jsdelivr.net/npm/jsqr@1.2.0/…')`. Comme le
 * bundle web contient tous les écrans, ce contact partait à **chaque chargement de
 * page**, y compris sur la page de politique de confidentialité qui affirme, elle,
 * que rien ne sort sans raison.
 *
 * Cacher le bouton de la caméra sur le web ne suffisait donc pas : l'import
 * subsistait, et avec lui la requête vers un tiers, qui voit l'adresse IP et le
 * navigateur de chaque visiteur.
 *
 * Toute utilisation de la caméra passe désormais par ce module. Sa variante
 * `.web.tsx` n'importe pas `expo-camera` du tout — le bundler la substitue à
 * celle-ci, et le contact disparaît. C'est vérifié par `npm run fumee`, qui charge
 * l'application dans un vrai navigateur et échoue à la moindre requête refusée.
 *
 * ## Ce que le module expose
 *
 * Le strict nécessaire pour les deux écrans qui photographient une CNIB, et rien de
 * plus : savoir si l'appareil existe, demander l'autorisation, afficher le viseur,
 * déclencher.
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';

/** Faux sur le web, où l'appareil n'est pas proposé. */
export const APPAREIL_DISPONIBLE = true;

export interface CommandeAppareil {
  /** Déclenche. Renvoie le chemin local du cliché, ou null si l'appareil n'est pas prêt. */
  prendre(qualite: number): Promise<string | null>;
}

export interface PermissionAppareil {
  accordee: boolean;
  /** Demande l'autorisation. Renvoie vrai si elle est accordée. */
  demander(): Promise<boolean>;
}

export function usePermissionAppareil(): PermissionAppareil {
  const [permission, demanderPermission] = useCameraPermissions();
  return {
    accordee: permission?.granted ?? false,
    demander: async () => (await demanderPermission()).granted,
  };
}

/** Le viseur, en plein écran. Le cadrage et les boutons appartiennent à l'appelant. */
export const VueAppareil = forwardRef<CommandeAppareil>(function VueAppareil(_props, reference) {
  const camera = useRef<CameraView>(null);

  useImperativeHandle(reference, () => ({
    async prendre(qualite) {
      const cliche = await camera.current?.takePictureAsync({ quality: qualite });
      return cliche?.uri ?? null;
    },
  }));

  return <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />;
});

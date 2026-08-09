/**
 * L'effet spatial : l'inclinaison du téléphone donne de la profondeur.
 *
 * Sur un appareil, on lit l'accéléromètre pour connaître l'angle du téléphone, et
 * on l'expose sous forme de deux valeurs animées (x, y) comprises entre -1 et 1.
 * Les composants s'en servent pour décaler leurs plans à des vitesses différentes
 * — le fond bouge peu, le premier plan beaucoup — ce qui crée la sensation de
 * relief du « mode spatial » d'iOS.
 *
 * Sur le web, il n'y a pas de capteur fiable : le hook renvoie des valeurs à zéro,
 * et tout reste simplement immobile. Aucune importation native n'est faite dans ce
 * cas, pour ne pas alourdir le bundle web.
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

export interface Inclinaison {
  /** Gauche (-1) ↔ droite (+1). */
  x: SharedValue<number>;
  /** Haut (-1) ↔ bas (+1). */
  y: SharedValue<number>;
}

/** Amplitude maximale de l'inclinaison prise en compte, en radians (~35°). */
const AMPLITUDE = 0.6;

/**
 * Rend deux valeurs animées suivant l'inclinaison du téléphone.
 *
 * `actif` permet de couper la lecture du capteur quand l'écran n'est pas visible,
 * pour ne pas consommer de batterie inutilement.
 */
export function useInclinaison(actif = true): Inclinaison {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    if (!actif || Platform.OS === 'web') return;

    let abonnement: { remove: () => void } | undefined;
    let monte = true;

    // Import différé : le module natif n'est chargé que sur un appareil.
    import('expo-sensors')
      .then(({ DeviceMotion }) => {
        if (!monte) return;
        DeviceMotion.setUpdateInterval(50); // 20 fois par seconde, largement fluide
        abonnement = DeviceMotion.addListener(({ rotation }) => {
          if (!rotation) return;
          // gamma = roulis (gauche/droite), beta = tangage (avant/arrière).
          const cible = (v: number) => Math.max(-1, Math.min(1, v / AMPLITUDE));
          x.value = withSpring(cible(rotation.gamma), { damping: 20, stiffness: 90 });
          y.value = withSpring(cible(rotation.beta), { damping: 20, stiffness: 90 });
        });
      })
      .catch(() => {
        // Capteur indisponible : on reste immobile, sans erreur.
      });

    return () => {
      monte = false;
      abonnement?.remove();
      x.value = withSpring(0);
      y.value = withSpring(0);
    };
  }, [actif, x, y]);

  return { x, y };
}

/**
 * Style de parallaxe pour un plan donné.
 *
 * `profondeur` règle l'amplitude du déplacement : une petite valeur pour l'arrière-
 * plan (il bouge à peine), une grande pour le premier plan (il suit franchement le
 * geste). `rotation` ajoute une légère bascule 3D, comme une carte qu'on incline.
 */
export function useStyleParallaxe(
  inclinaison: Inclinaison,
  profondeur = 12,
  rotation = 0,
) {
  return useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { translateX: inclinaison.x.value * profondeur },
      { translateY: inclinaison.y.value * profondeur },
      { rotateY: `${inclinaison.x.value * rotation}deg` },
      { rotateX: `${-inclinaison.y.value * rotation}deg` },
    ],
  }));
}

/** Variante pour une lueur ou un reflet : seul le déplacement, sans rotation. */
export function useStyleReflet(inclinaison: Inclinaison, amplitude = 40) {
  return useAnimatedStyle(() => ({
    transform: [
      { translateX: inclinaison.x.value * amplitude },
      { translateY: inclinaison.y.value * amplitude * 0.5 },
    ],
  }));
}

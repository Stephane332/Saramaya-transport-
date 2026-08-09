/**
 * Une carte qui prend du relief quand on incline le téléphone.
 *
 * Elle bascule légèrement en 3D vers le geste, et un reflet lumineux glisse à sa
 * surface dans le sens inverse — comme la lumière sur une vraie carte plastifiée.
 * L'effet est celui des visuels « spatiaux » d'iOS : discret, mais il donne à
 * l'objet une présence physique.
 *
 * Sur le web (pas de capteur), la carte reste immobile : aucun effet parasite.
 */

import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useInclinaison, useStyleParallaxe } from '../lib/parallaxe';
import { rayon } from '../theme';

export function CarteSpatiale({
  children,
  style,
  intensite = 6,
  reflet = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Amplitude de la bascule, en degrés. */
  intensite?: number;
  reflet?: boolean;
}) {
  const inclinaison = useInclinaison();
  const styleBascule = useStyleParallaxe(inclinaison, 4, intensite);

  return (
    <Animated.View style={[styleBascule, style]}>
      {children}
      {reflet ? <Reflet x={inclinaison.x} y={inclinaison.y} /> : null}
    </Animated.View>
  );
}

/** Bande de lumière qui traverse la carte selon l'inclinaison. */
function Reflet({ x, y }: { x: SharedValue<number>; y: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.05 + Math.abs(x.value) * 0.22,
    transform: [
      { translateX: x.value * 90 },
      { translateY: y.value * 60 },
      { rotate: '22deg' },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.zoneReflet, style]}>
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/**
 * Un plan qui flotte au-dessus de la carte, à sa propre profondeur : posé sur une
 * CarteSpatiale, il se décale plus (ou moins) que le fond, ce qui creuse la scène.
 */
export function PlanFlottant({
  children,
  profondeur = 18,
  style,
}: {
  children: ReactNode;
  profondeur?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const inclinaison = useInclinaison();
  const styleParallaxe = useStyleParallaxe(inclinaison, profondeur, 0);
  return <Animated.View style={[styleParallaxe, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  zoneReflet: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    left: -60,
    width: 90,
    borderRadius: rayon.xl,
    overflow: 'hidden',
  },
});

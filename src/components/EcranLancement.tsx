/**
 * Écran de lancement animé.
 *
 * Le bus arrive par la gauche, ralentit, se pose au centre — puis s'efface pour
 * laisser le kangourou du logo prendre exactement sa place. C'est le trajet lui-même
 * qui amène la marque : le mouvement raconte ce que fait l'application avant même
 * qu'un mot soit lu.
 *
 * Trois exigences ont guidé la réalisation :
 *
 *   - **Ne jamais retarder personne.** L'animation se joue pendant que les données
 *     du téléphone sont relues. Si la relecture prend plus longtemps, on attend ; si
 *     elle est déjà finie, on ne rallonge pas pour autant le spectacle.
 *   - **Rester fidèle au logo.** Le kangourou est rouge, comme sur leurs autocars et
 *     leur papeterie. Il apparaît là où le bus s'est arrêté, à la même échelle.
 *   - **Tenir sur un téléphone modeste.** Pas de 3D ici : des formes vectorielles et
 *     des translations, ce que même un appareil d'entrée de gamme affiche à 60 images
 *     par seconde. La 3D est réservée aux écrans où l'on a le temps de la regarder.
 */

import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { couleurs, typo } from '../theme';

/**
 * Repères de la chorégraphie, en millisecondes depuis le début.
 *
 * Le maintien final n'est pas du remplissage : sans lui, le kangourou s'effaçait
 * avant même d'avoir fini de paraître, et l'on ne voyait qu'un éclair rouge. Un logo
 * qu'on n'a pas le temps de reconnaître ne sert à rien.
 */
const ARRIVEE = 800; // le bus traverse et se pose
const POSE = 260; // il souffle un instant
const BASCULE = 420; // le bus s'efface, le kangourou paraît
const MAINTIEN = 520; // on laisse le logo se faire regarder
const SORTIE = 280; // fondu vers l'application
const FIN = ARRIVEE + POSE + BASCULE + MAINTIEN;

const LARGEUR_BUS = 210;

export function EcranLancement({
  peutPartir,
  onTermine,
}: {
  /** Vrai quand les données du téléphone sont relues : l'écran peut alors s'effacer. */
  peutPartir: boolean;
  onTermine: () => void;
}) {
  const { width } = useWindowDimensions();
  const [introFinie, setIntroFinie] = useState(false);

  // Le bus part hors écran, à gauche, quelle que soit la largeur de l'appareil.
  const avance = useSharedValue(-(width / 2 + LARGEUR_BUS));
  const suspension = useSharedValue(0);
  const busVisible = useSharedValue(1);
  const kangourou = useSharedValue(0);
  const voile = useSharedValue(1);

  useEffect(() => {
    // Arrivée : vive au début, franchement ralentie à la fin, comme un vrai freinage.
    avance.value = withTiming(0, { duration: ARRIVEE, easing: Easing.out(Easing.cubic) });

    // Léger tangage de suspension pendant le trajet, puis retour à plat.
    suspension.value = withSequence(
      withTiming(-3, { duration: 190 }),
      withTiming(2, { duration: 190 }),
      withTiming(-1.5, { duration: 190 }),
      withTiming(0, { duration: 210, easing: Easing.out(Easing.quad) }),
    );

    // Le bus s'efface, le kangourou paraît au même endroit : une relève, pas un
    // remplacement — les deux se croisent sur une centaine de millisecondes.
    busVisible.value = withDelay(
      ARRIVEE + POSE,
      withTiming(0, { duration: BASCULE * 0.6, easing: Easing.in(Easing.quad) }),
    );
    kangourou.value = withDelay(
      ARRIVEE + POSE + BASCULE * 0.35,
      withTiming(1, { duration: BASCULE, easing: Easing.out(Easing.back(1.4)) }),
    );

    // La chorégraphie est jouée ; le départ, lui, dépend de la relecture des données.
    const minuteur = setTimeout(() => setIntroFinie(true), FIN);
    return () => clearTimeout(minuteur);
  }, [avance, suspension, busVisible, kangourou]);

  /**
   * Fondu final. Il n'est déclenché que lorsque l'animation est allée à son terme
   * *et* que les données sont prêtes : jamais un écran figé sur un logo effacé, et
   * jamais l'application découverte avant que le kangourou ait paru.
   */
  useEffect(() => {
    if (!introFinie || !peutPartir) return;
    voile.value = withTiming(0, { duration: SORTIE }, (fini) => {
      if (fini) runOnJS(onTermine)();
    });
  }, [introFinie, peutPartir, voile, onTermine]);

  const styleVoile = useAnimatedStyle(() => ({ opacity: voile.value }));

  const styleBus = useAnimatedStyle(() => ({
    opacity: busVisible.value,
    transform: [
      { translateX: avance.value },
      { translateY: suspension.value },
      // Le bus rétrécit très légèrement en s'effaçant : il s'éloigne, il ne disparaît pas.
      { scale: 0.94 + busVisible.value * 0.06 },
    ],
  }));

  const styleKangourou = useAnimatedStyle(() => ({
    opacity: kangourou.value,
    transform: [{ scale: 0.82 + kangourou.value * 0.18 }],
  }));

  // Traînées de vitesse : elles s'effacent en même temps que le bus se pose.
  const styleTrainees = useAnimatedStyle(() => ({
    opacity: busVisible.value * Math.max(0, 1 - (avance.value + width) / width),
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.fond, styleVoile]}>
      <View style={styles.scene}>
        <Animated.View style={[styles.trainees, styleTrainees]}>
          <View style={[styles.trainee, { width: 54, opacity: 0.5 }]} />
          <View style={[styles.trainee, { width: 34, opacity: 0.35 }]} />
          <View style={[styles.trainee, { width: 68, opacity: 0.22 }]} />
        </Animated.View>

        <Animated.View style={[styles.calque, styleBus]}>
          <BusDeProfil />
        </Animated.View>

        <Animated.View style={[styles.calque, styleKangourou]}>
          <Image
            source={require('../../assets/marque/kangourou.png')}
            style={styles.kangourou}
            // La silhouette est recolorée ici : le rouge de la marque, sur le fond du thème.
            tintColor={couleurs.marque}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      <Animated.Text style={[typo.section, styles.nom, styleKangourou]}>
        SARAMAYA TRANSPORT
      </Animated.Text>
    </Animated.View>
  );
}

/**
 * L'autocar vu de profil, d'après les vrais véhicules : carrosserie blanche,
 * grande courbe rouge remontant vers l'arrière, bandeau rouge en bas de caisse.
 */
function BusDeProfil() {
  return (
    <Svg width={LARGEUR_BUS} height={LARGEUR_BUS * 0.42} viewBox="0 0 210 88">
      {/* Ombre portée au sol */}
      <Ellipse cx="105" cy="82" rx="86" ry="5" fill="rgba(0,0,0,0.28)" />

      {/* Caisse */}
      <Rect x="6" y="12" width="198" height="60" rx="13" fill="#FBF8F9" />

      {/* La courbe rouge caractéristique du flanc */}
      <Path
        d="M6 58 C 60 58, 96 44, 138 30 C 164 21, 186 17, 204 16 L 204 59 C 186 59, 150 59, 6 59 Z"
        fill={couleurs.marque}
      />
      {/* Bandeau de bas de caisse */}
      <Rect x="6" y="60" width="198" height="12" rx="6" fill={couleurs.marqueProfond} />

      {/* Vitres */}
      <Rect x="18" y="22" width="42" height="20" rx="5" fill="#0E1116" />
      <Rect x="66" y="22" width="38" height="18" rx="5" fill="#0E1116" />
      <Rect x="110" y="21" width="36" height="15" rx="5" fill="#0E1116" />
      {/* Pare-brise, incliné côté avant */}
      <Path d="M152 20 L196 17 C201 17, 202 20, 202 24 L202 36 L152 36 Z" fill="#0E1116" />

      {/* Phare */}
      <Rect x="196" y="46" width="9" height="7" rx="3" fill="#FFE9A8" />

      {/* Roues */}
      <Circle cx="52" cy="72" r="13" fill="#15131A" />
      <Circle cx="52" cy="72" r="5" fill="#B9B2BC" />
      <Circle cx="162" cy="72" r="13" fill="#15131A" />
      <Circle cx="162" cy="72" r="5" fill="#B9B2BC" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fond: {
    backgroundColor: couleurs.fond,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scene: { width: '100%', height: 150, alignItems: 'center', justifyContent: 'center' },
  // Bus et kangourou occupent la même case : la relève se fait sans déplacement.
  calque: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  kangourou: { width: 132, height: 132 },
  trainees: { position: 'absolute', right: '58%', gap: 9 },
  trainee: { height: 3, borderRadius: 2, backgroundColor: couleurs.marqueVif },
  nom: { color: couleurs.texteFaible, marginTop: 26, letterSpacing: 2.4 },
});

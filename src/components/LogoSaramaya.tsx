/**
 * Le logo officiel de Saramaya Transport.
 *
 * Deux déclinaisons du même fichier, extrait de leur site : la version d'origine
 * pour les fonds clairs, et une version dont le noir a été passé en blanc pour
 * rester lisible sur le fond sombre de l'application.
 *
 * Le logo appartient à la compagnie. Il est utilisé ici parce que l'application
 * est construite pour elle ; sa diffusion publique suppose son accord écrit.
 */

import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { couleurs, typo } from '../theme';
import { Txt } from './base';

const CLAIR = require('../../assets/marque/saramaya-logo-clair.png');
const SOMBRE = require('../../assets/marque/saramaya-logo.png');

/** Rapport largeur / hauteur du fichier source (388 × 269). */
const RATIO = 388 / 269;

export function LogoSaramaya({
  hauteur = 48,
  surFondClair = false,
  style,
}: {
  hauteur?: number;
  /** Vrai quand le logo est posé sur du blanc — sur le billet, par exemple. */
  surFondClair?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      <Image
        source={surFondClair ? SOMBRE : CLAIR}
        style={{ height: hauteur, width: hauteur * RATIO }}
        resizeMode="contain"
      />
    </View>
  );
}

/** La devise imprimée sous le logo, reprise telle quelle. */
export function Devise({ couleur = couleurs.texteFaible }: { couleur?: string }) {
  return (
    <Txt v="minuscule" couleur={couleur} style={{ letterSpacing: 1.6 }}>
      SÉCURITÉ, CONFORT, RESPECT
    </Txt>
  );
}

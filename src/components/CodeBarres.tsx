/**
 * Code-barres Code 39, comme celui imprimé sur le ticket papier.
 *
 * L'encodage est réel — un lecteur de code-barres du commerce lit bien la
 * référence — pour que le billet numérique et le billet papier se scannent de la
 * même façon, avec le même matériel.
 */

import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { encoder } from '../lib/code39';

export function CodeBarres({
  valeur,
  hauteur = 44,
  couleur = '#0A070E',
  largeurMax = 260,
}: {
  valeur: string;
  hauteur?: number;
  couleur?: string;
  largeurMax?: number;
}) {
  const { barres, total } = encoder(valeur);
  if (total === 0) return null;

  return (
    <View style={{ width: '100%', maxWidth: largeurMax, height: hauteur }}>
      <Svg width="100%" height={hauteur} viewBox={`0 0 ${total} ${hauteur}`} preserveAspectRatio="none">
        {barres.map((b, i) => (
          <Rect key={i} x={b.x} y={0} width={b.largeur} height={hauteur} fill={couleur} />
        ))}
      </Svg>
    </View>
  );
}

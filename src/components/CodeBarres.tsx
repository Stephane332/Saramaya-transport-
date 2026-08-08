/**
 * Code-barres Code 39, comme celui imprimé sur le ticket papier.
 *
 * L'encodage est réel — un lecteur de code-barres du commerce lit bien la
 * référence — pour que le billet numérique et le billet papier se scannent de la
 * même façon, avec le même matériel.
 */

import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

/** Chaque caractère : 5 barres et 4 espaces, larges (w) ou étroits (n). */
const MOTIFS: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  '-': 'nnwnnnwnw',
  '*': 'nnwnwwnwn',
};

const LARGE = 3;
const ETROIT = 1;

interface Barre {
  x: number;
  largeur: number;
}

function encoder(valeur: string): { barres: Barre[]; total: number } {
  // Code 39 encadre toujours la donnée par le caractère de garde « * ».
  const caracteres = ['*', ...valeur.toUpperCase().split(''), '*'];
  const barres: Barre[] = [];
  let x = 0;

  caracteres.forEach((caractere, indexCaractere) => {
    const motif = MOTIFS[caractere];
    if (!motif) return;

    motif.split('').forEach((element, index) => {
      const largeur = element === 'w' ? LARGE : ETROIT;
      // Les indices pairs sont des barres, les impairs des espaces.
      if (index % 2 === 0) barres.push({ x, largeur });
      x += largeur;
    });

    // Séparateur inter-caractère, sauf après le dernier.
    if (indexCaractere < caracteres.length - 1) x += ETROIT;
  });

  return { barres, total: x };
}

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

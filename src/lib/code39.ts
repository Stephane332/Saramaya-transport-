/**
 * Encodage Code 39 — le même que celui imprimé sur le ticket papier.
 *
 * Isolé du composant qui le dessine pour une raison précise : c'est du calcul pur,
 * donc vérifiable par `npm test` sans écran ni téléphone. La faute qui s'y cachait
 * — des lettres silencieusement sautées, un caractère de garde invalide — est
 * exactement le genre de chose qu'un test attrape et qu'un coup d'œil ne voit pas :
 * un code-barres faux ressemble trait pour trait à un code-barres juste.
 */

/**
 * Table Code 39 complète — 43 caractères plus le caractère de garde « * ».
 *
 * Chaque caractère occupe neuf éléments, alternant barre et espace en commençant
 * par une barre, chacun large (`w`) ou étroit (`n`). **Exactement trois éléments
 * sur neuf sont larges** : deux barres et un espace pour les quarante caractères
 * ordinaires, trois espaces et aucune barre pour `$ / + %`. C'est cette règle qui
 * permet de vérifier la table plutôt que de la recopier en espérant.
 *
 * Elle ne contenait auparavant que les chiffres, `-` et `*`. Deux conséquences,
 * l'une visible et l'autre non :
 *
 * 1. Les lettres étaient **silencieusement ignorées**. Nos références ont la forme
 *    `SB-7K2Q4M` : le code-barres imprimé sur le billet encodait `-724`. Un lecteur
 *    du commerce lisait donc une référence qui n'existe pas, sans erreur apparente.
 * 2. `-` et `*` étaient eux-mêmes **faux** — trois barres larges pour le premier,
 *    deux espaces larges pour le second. Le caractère de garde étant invalide,
 *    aucun lecteur ne pouvait décoder quoi que ce soit.
 */
export const MOTIFS: Record<string, string> = {
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
  'A': 'wnnnnwnnw',
  'B': 'nnwnnwnnw',
  'C': 'wnwnnwnnn',
  'D': 'nnnnwwnnw',
  'E': 'wnnnwwnnn',
  'F': 'nnwnwwnnn',
  'G': 'nnnnnwwnw',
  'H': 'wnnnnwwnn',
  'I': 'nnwnnwwnn',
  'J': 'nnnnwwwnn',
  'K': 'wnnnnnnww',
  'L': 'nnwnnnnww',
  'M': 'wnwnnnnwn',
  'N': 'nnnnwnnww',
  'O': 'wnnnwnnwn',
  'P': 'nnwnwnnwn',
  'Q': 'nnnnnnwww',
  'R': 'wnnnnnwwn',
  'S': 'nnwnnnwwn',
  'T': 'nnnnwnwwn',
  'U': 'wwnnnnnnw',
  'V': 'nwwnnnnnw',
  'W': 'wwwnnnnnn',
  'X': 'nwnnwnnnw',
  'Y': 'wwnnwnnnn',
  'Z': 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  '$': 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
  '*': 'nwnnwnwnn',
};

const LARGE = 3;
const ETROIT = 1;

interface Barre {
  x: number;
  largeur: number;
}

export function encoder(valeur: string): { barres: Barre[]; total: number } {
  // Code 39 encadre toujours la donnée par le caractère de garde « * ».
  const caracteres = ['*', ...valeur.toUpperCase().split(''), '*'];

  /*
   * Un caractère inconnu faisait auparavant l'objet d'un `return` discret, qui le
   * sautait : le code-barres se dessinait quand même, en encodant autre chose que
   * la référence. Un dessin faux est pire que pas de dessin — il se scanne, et
   * donne un numéro qui n'existe pas. On ne rend donc rien du tout, et l'écran
   * affiche la référence en clair, qui elle est juste.
   */
  if (caracteres.some((c) => !MOTIFS[c])) return { barres: [], total: 0 };

  const barres: Barre[] = [];
  let x = 0;

  caracteres.forEach((caractere, indexCaractere) => {
    const motif = MOTIFS[caractere]!;

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

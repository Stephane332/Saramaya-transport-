/**
 * Ranger les images de carte dans leurs deux places — recto et dos.
 *
 * L'écran d'inscription tient exactement deux images. La question est de savoir
 * laquelle va où, et la réponse normale vient du contenu : une bande de trois lignes
 * de trente caractères, c'est le dos ; des étiquettes « Nom : », c'est le recto.
 * Demander « est-ce le recto ou le verso ? » serait une question de plus, à laquelle
 * l'image répond déjà.
 *
 * ## Le défaut que ce module corrige
 *
 * Quand la reconnaissance de caractères **n'est pas disponible** — dans Expo Go, sur
 * le web, ou simplement sur une photo floue — le contenu ne dit rien. La lecture
 * était pourtant renvoyée comme un recto, faute de mieux. Conséquence : la deuxième
 * image chassait la première, puisqu'elles revendiquaient la même place. On pouvait
 * appuyer dix fois sur « Photographier ma carte », il n'y avait jamais qu'une seule
 * photo, et la place du dos restait vide pour toujours.
 *
 * Une face qu'on n'a pas déduite ne doit donc pas être affirmée : `faceDeduite` dit
 * si le contenu a parlé, et une lecture muette prend simplement **la première place
 * libre** au lieu d'en revendiquer une.
 *
 * Ce module ne dépend d'aucun module natif : c'est du rangement, il se teste.
 */

import type { IdentiteLue } from './cnib';
import type { IdentiteRecto } from './cnibRecto';

export type FaceCarte = 'RECTO' | 'VERSO';

/** Les deux places, dans l'ordre où on les propose. */
export const FACES: readonly FaceCarte[] = ['RECTO', 'VERSO'];

export interface LectureFace {
  face: FaceCarte;
  /**
   * Vrai quand le contenu de l'image a désigné la face lui-même.
   *
   * Faux quand on n'a pas pu lire : la face vaut alors ce qu'elle vaut, une place
   * attribuée par défaut, et rien ne doit être affirmé à l'utilisateur sur son
   * fondement.
   */
  faceDeduite: boolean;
  /** Chemin local de l'image retenue. Reste sur l'appareil. */
  uri: string;
  /** Texte brut rendu par la reconnaissance, conservé pour diagnostic. */
  texte: string;
  /** Renseigné quand la reconnaissance n'a pas pu avoir lieu. */
  raisonIndisponible?: string;
  /** Identité décodée depuis la bande, quand la face lue est le dos. */
  bande?: IdentiteLue;
  /** Les trois lignes brutes de la bande, pour les réafficher telles quelles. */
  bandeBrute?: string;
  /** Avertissements des clés de contrôle. */
  avertissements: string[];
  /** Champs lus au recto. */
  recto?: IdentiteRecto;
}

/**
 * Range une lecture parmi celles déjà faites, et rend la liste complète.
 *
 * Trois cas, dans cet ordre :
 *
 * 1. **La face est déduite** — elle prend la place qu'elle nomme, en remplaçant ce
 *    qui s'y trouvait. C'est le cas normal : reprendre le dos remplace le dos.
 * 2. **La face est indéterminée et une place est libre** — elle la prend. C'est ce
 *    qui permet d'ajouter les deux images quand rien ne peut être lu.
 * 3. **La face est indéterminée et les deux places sont prises** — elle remplace une
 *    image dont la face n'était pas mieux établie que la sienne, et jamais une
 *    lecture réussie : une photo illisible ne doit pas chasser une face décodée.
 */
export function placerLecture(lectures: LectureFace[], nouvelle: LectureFace): LectureFace[] {
  if (nouvelle.faceDeduite) {
    return [...lectures.filter((l) => l.face !== nouvelle.face), nouvelle];
  }

  const occupees = new Set(lectures.map((l) => l.face));
  const libre = FACES.find((f) => !occupees.has(f));
  if (libre) return [...lectures, { ...nouvelle, face: libre }];

  const indexRemplacable = lectures.findIndex((l) => !l.faceDeduite);
  const index = indexRemplacable === -1 ? 0 : indexRemplacable;
  return lectures.map((l, i) => (i === index ? { ...nouvelle, face: l.face } : l));
}

/**
 * L'identité de l'application, lue à la source.
 *
 * Le numéro de version vient d'`app.json` par `expo-constants`, et non d'une
 * constante recopiée ici : deux endroits qui portent la même valeur finissent
 * toujours par diverger, et c'est précisément le genre d'écart qu'un utilisateur
 * remarque — un écran qui annonce 1.0.0 dans une application qui en est à 1.2.
 *
 * Le reste — nom de l'application, nom de la compagnie, concepteur — est écrit une
 * fois et repris partout : bas de l'écran Profil, conditions d'utilisation, page de
 * confidentialité. C'est ce qui garantit que les trois racontent la même chose.
 */

import Constants from 'expo-constants';

/** Nom d'usage de l'application, distinct de celui de la compagnie. */
export const NOM_APPLICATION = 'Siraba';

/** La compagnie dont l'application accompagne les voyages. */
export const NOM_COMPAGNIE = 'Saramaya Transport';

/**
 * Le concepteur, nommé — une signature, pas une explication.
 *
 * Elle tient sur une ligne au bas du profil et de la page de confidentialité. Le
 * paragraphe qui l'accompagnait (« application indépendante, ni éditée ni exploitée
 * par la compagnie… ») a été retiré de ces pieds de page : il alourdissait un
 * endroit fait pour des noms. Il n'a pas disparu pour autant — il est dans les
 * conditions d'utilisation et dans la politique, où les deux boutiques le cherchent,
 * et où un lecteur qui veut savoir à qui s'adresser va effectivement le lire.
 */
export const CONCEPTEUR = 'Ange Stéphane Sawadogo';

/** Version publiée, telle qu'elle figure dans `app.json`. */
export const VERSION = Constants.expoConfig?.version ?? '—';

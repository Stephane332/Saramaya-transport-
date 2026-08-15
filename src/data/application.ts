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
 * Le concepteur, nommé.
 *
 * Il n'apparaît plus au bas des écrans — le pied de l'application porte les deux
 * noms qui intéressent le voyageur, celui de la compagnie et celui de l'application.
 * Mais il reste nommé dans les conditions d'utilisation et dans la politique de
 * confidentialité, et ce n'est pas une formalité : les deux boutiques refusent une
 * application dont on ne sait pas qui la publie, et un texte qui explique vos droits
 * sans dire à qui les adresser ne vaut rien.
 */
export const CONCEPTEUR = 'Ange Stéphane Sawadogo';

/** Version publiée, telle qu'elle figure dans `app.json`. */
export const VERSION = Constants.expoConfig?.version ?? '—';

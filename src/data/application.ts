/**
 * L'identité de l'application, lue à la source.
 *
 * Le numéro de version vient d'`app.json` par `expo-constants`, et non d'une
 * constante recopiée ici : deux endroits qui portent la même valeur finissent
 * toujours par diverger, et c'est précisément le genre d'écart qu'un utilisateur
 * remarque — un écran qui annonce 1.0.0 dans une application qui en est à 1.2.
 *
 * Le reste — nom, concepteur, position vis-à-vis de la compagnie — est écrit une
 * fois et repris partout : bas de l'écran Profil, conditions d'utilisation, page de
 * confidentialité. C'est ce qui garantit que les trois racontent la même chose.
 */

import Constants from 'expo-constants';

/** Nom d'usage de l'application, distinct de celui de la compagnie. */
export const NOM_APPLICATION = 'Siraba';

/**
 * Le concepteur, nommé.
 *
 * L'application est écrite par un client de Saramaya Transport, et non par la
 * compagnie. Le dire n'est pas une formalité : c'est ce qui évite qu'un voyageur
 * appelle la mauvaise porte quand quelque chose ne va pas, et ce qui protège la
 * compagnie d'être tenue responsable d'un logiciel qu'elle n'a pas édité.
 */
export const CONCEPTEUR = 'Ange Stéphane Sawadogo';

/** Version publiée, telle qu'elle figure dans `app.json`. */
export const VERSION = Constants.expoConfig?.version ?? '—';

/**
 * Ce que l'application est, en une phrase, pour les endroits où il faut le rappeler.
 */
export const MENTION_INDEPENDANCE =
  `${NOM_APPLICATION} est une application indépendante, conçue par un client de ` +
  "Saramaya Transport. Elle n'est ni éditée ni exploitée par la compagnie.";

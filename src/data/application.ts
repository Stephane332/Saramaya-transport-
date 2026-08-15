/**
 * L'identité de l'application, lue à la source.
 *
 * Le numéro de version vient d'`app.json` par `expo-constants`, et non d'une
 * constante recopiée ici : deux endroits qui portent la même valeur finissent
 * toujours par diverger, et c'est précisément le genre d'écart qu'un utilisateur
 * remarque — un écran qui annonce 1.0.0 dans une application qui en est à 1.2.
 *
 * Le reste — nom de la compagnie, concepteur — est écrit une fois et repris partout :
 * bas de l'écran Profil, conditions d'utilisation, page de confidentialité. C'est ce
 * qui garantit que les trois racontent la même chose.
 *
 * ## Il n'y a plus de nom d'application distinct
 *
 * L'application s'appelait « Siraba ». Elle porte désormais le nom de la compagnie,
 * partout : icône du téléphone, écrans, identifiant d'installation.
 *
 * Une conséquence à ne pas manquer : les textes légaux ne peuvent plus dire « Siraba
 * n'a pas de serveur ». Écrite avec le nom de la compagnie, la phrase deviendrait
 * fausse — Saramaya Transport a un système, c'est justement celui auquel
 * l'application veut se brancher un jour. Ces textes disent donc **« cette
 * application »**, qui désigne le logiciel sans jamais parler au nom de la
 * compagnie. La distinction a disparu du nom, elle reste dans les mots.
 */

import Constants from 'expo-constants';

/** La compagnie dont l'application accompagne les voyages, et dont elle porte le nom. */
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

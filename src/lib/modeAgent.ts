/**
 * Mode agent — séparé de l'application des voyageurs.
 *
 * Les écrans destinés au personnel de la gare (manifeste des départs, caisse et
 * son numéro Orange Money) n'ont rien à faire dans l'application qu'un voyageur
 * installe : ce sont des outils internes, et les exposer à tout le monde serait
 * à la fois déroutant et imprudent.
 *
 * Ils vivent donc dans le même code, mais derrière un interrupteur de compilation.
 * L'application publique est construite sans lui : les écrans agent ne sont
 * accessibles nulle part, et aucun bouton n'y renvoie. Le jour où la compagnie
 * accepte, on produit une seconde application — même code, même qualité — avec
 * EXPO_PUBLIC_MODE_AGENT=1, réservée à leurs guichets.
 *
 * C'est ce que veut dire « relier notre système au leur » côté distribution :
 * une application pour les voyageurs, une pour les agents, un seul code à tenir.
 */

export const MODE_AGENT = process.env.EXPO_PUBLIC_MODE_AGENT === '1';

/**
 * Reconnaissance de caractères sur une photo — branchée, mais pas encore livrable.
 *
 * L'inscription se fait à partir d'une photo de la CNIB : c'est le geste attendu, et
 * tout l'écran est construit autour. Reste l'étape qui transforme les pixels en
 * texte, et elle demande un module natif — Vision côté Apple, ML Kit côté Google —
 * qui n'existe pas dans Expo Go.
 *
 * Plutôt que d'attendre ce module pour écrire le reste, tout est fait autour :
 *
 *   photo → **reconnaissance** → extraction de la bande → décodage → formulaire
 *            ^^^^^^^^^^^^^^^^
 *            la seule pièce manquante
 *
 * Ce fichier est cette pièce. Il tente de charger le module au moment où on en a
 * besoin ; s'il est absent, il le dit au lieu d'échouer, et l'écran propose la
 * saisie de la bande — qui remplit exactement les mêmes champs par le même chemin.
 *
 * Pour l'allumer, une fois en build de développement ou de production :
 *
 *     npx expo install @react-native-ml-kit/text-recognition
 *
 * Rien d'autre à changer : la fonction ci-dessous le détecte et s'en sert. C'est
 * pourquoi le chargement est dynamique et non un import en tête de fichier — un
 * import classique ferait échouer le paquet entier dans Expo Go.
 */

export interface Reconnaissance {
  disponible: boolean;
  /** Texte lu sur l'image, tel quel — brut, désordonné, à trier ensuite. */
  texte: string;
  /** Renseigné quand la reconnaissance n'a pas pu avoir lieu. */
  raison?: string;
}

const INDISPONIBLE =
  "La lecture automatique d'image n'est pas disponible dans Expo Go. Recopiez la bande du dos : elle contient les mêmes informations.";

/**
 * Lit le texte d'une image. Ne lève jamais : renvoie toujours un résultat
 * exploitable, disponible ou non.
 */
export async function lireTexteImage(uri: string): Promise<Reconnaissance> {
  try {
    /*
     * Chargement à l'exécution, par un nom que le compilateur ne peut pas résoudre.
     * C'est volontaire : le module est facultatif, et un import littéral ferait
     * échouer la compilation tant qu'il n'est pas installé — or tout le reste du
     * projet doit continuer à se construire sans lui.
     */
    const nomModule = '@react-native-ml-kit/text-recognition';
    const module: unknown = await import(nomModule).catch(() => null);

    const reconnaitre = (
      module as { default?: { recognize?: (u: string) => Promise<{ text: string }> } } | null
    )?.default?.recognize;
    if (!reconnaitre) return { disponible: false, texte: '', raison: INDISPONIBLE };

    const resultat = await reconnaitre(uri);
    return { disponible: true, texte: resultat.text ?? '' };
  } catch (erreur) {
    return {
      disponible: false,
      texte: '',
      raison: erreur instanceof Error ? erreur.message : INDISPONIBLE,
    };
  }
}

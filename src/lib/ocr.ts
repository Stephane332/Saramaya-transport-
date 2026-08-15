/**
 * Reconnaissance de caractères sur une image — la pièce qui transforme une photo
 * de CNIB en texte.
 *
 * L'inscription se fait à partir d'une image de la carte : c'est le geste attendu,
 * et tout l'écran est construit autour.
 *
 *   image → **reconnaissance** → bande ou champs du recto → décodage → formulaire
 *           ^^^^^^^^^^^^^^^^^^
 *                  ici
 *
 * ## Ce qui fait la lecture, et où
 *
 * Le travail est fait par le **système du téléphone** : Vision chez Apple, ML Kit
 * chez Google. Rien n'est envoyé nulle part — la reconnaissance a lieu sur
 * l'appareil, hors ligne, et c'est aussi pour cela qu'elle est instantanée.
 *
 * Deux modules sont essayés, dans cet ordre :
 *
 * 1. `expo-text-extractor`, module Expo qui expose Vision et ML Kit ;
 * 2. `@react-native-ml-kit/text-recognition`, s'il est présent dans un projet qui
 *    l'utilisait déjà.
 *
 * ## Là où ça ne marche pas, et ce qu'on en dit
 *
 * Ces modules sont **natifs** : ils doivent être compilés dans l'application. Ils
 * n'existent donc ni dans Expo Go, ni dans la version web. L'application ne fait
 * pas semblant et ne renvoie pas un message vague : elle dit **précisément** ce qui
 * manque et par quoi le remplacer, car la réponse n'est pas la même sur le web et
 * dans Expo Go.
 *
 * Le chargement est dynamique, par un nom que le compilateur ne résout pas. C'est
 * volontaire : le projet doit continuer à se construire — et la version web à se
 * produire — même quand ces modules sont absents.
 */

import { Platform } from 'react-native';

export interface Reconnaissance {
  disponible: boolean;
  /** Texte lu sur l'image, tel quel — brut, désordonné, à trier ensuite. */
  texte: string;
  /** Renseigné quand la reconnaissance n'a pas pu avoir lieu. */
  raison?: string;
}

/**
 * Pourquoi la lecture n'a pas lieu, et quoi faire — formulé pour l'endroit exact
 * où se trouve la personne. « Pas disponible » sans plus serait une impasse.
 */
export function raisonIndisponibilite(): string {
  if (Platform.OS === 'web') {
    return (
      "La lecture automatique d'image demande le moteur de reconnaissance du téléphone, " +
      "qui n'existe pas dans un navigateur. Recopiez la bande du dos ci-dessous — elle " +
      'contient les mêmes informations, décodées et vérifiées de la même façon — ou ' +
      "saisissez les champs à la main. Dans l'application installée, la lecture est automatique."
    );
  }
  return (
    "La lecture automatique d'image n'est pas incluse dans Expo Go : elle demande un " +
    "module compilé dans l'application. Recopiez la bande du dos ci-dessous — même " +
    'décodage, mêmes clés de contrôle — ou saisissez les champs à la main.'
  );
}

/*
 * Les deux noms de modules, en constantes.
 *
 * Ils ne peuvent être ni des littéraux dans l'`import()` — le bundler tenterait de
 * les résoudre à la construction et échouerait s'ils sont absents — ni des
 * paramètres de fonction, que Metro refuse tout net. Une constante locale est la
 * seule forme qui passe, et c'est pour cela que les deux chargements sont écrits à
 * la main plutôt que factorisés.
 */
const MODULE_EXPO = 'expo-text-extractor';
const MODULE_MLKIT = '@react-native-ml-kit/text-recognition';

/**
 * Lit le texte d'une image. Ne lève jamais : renvoie toujours un résultat
 * exploitable, disponible ou non.
 */
export async function lireTexteImage(uri: string): Promise<Reconnaissance> {
  if (Platform.OS === 'web') {
    return { disponible: false, texte: '', raison: raisonIndisponibilite() };
  }

  try {
    // 1. Le module Expo, qui expose Vision (iOS) et ML Kit (Android).
    const extracteur = (await import(MODULE_EXPO).catch(() => null)) as {
      isSupported?: boolean;
      extractTextFromImage?: (u: string) => Promise<string[]>;
    } | null;

    if (extracteur?.extractTextFromImage && extracteur.isSupported !== false) {
      const morceaux = await extracteur.extractTextFromImage(uri);
      // Le module rend des fragments : une ligne par bloc reconnu. La bande du dos
      // a besoin de ses retours à la ligne pour être découpée en trois.
      return { disponible: true, texte: morceaux.join('\n') };
    }

    // 2. Repli sur ML Kit en module autonome, si le projet l'a déjà.
    const mlkit = (await import(MODULE_MLKIT).catch(() => null)) as {
      default?: { recognize?: (u: string) => Promise<{ text: string }> };
    } | null;

    const reconnaitre = mlkit?.default?.recognize;
    if (reconnaitre) {
      const resultat = await reconnaitre(uri);
      return { disponible: true, texte: resultat.text ?? '' };
    }

    return { disponible: false, texte: '', raison: raisonIndisponibilite() };
  } catch {
    /*
     * Le message d'origine ne remonte pas à l'écran.
     *
     * Ce que lève un module natif absent, c'est « Cannot find native module
     * 'ExpoTextExtractor' » — de l'anglais technique, qui ne dit à personne quoi
     * faire ensuite. La phrase de `raisonIndisponibilite()` le dit, elle, et dans la
     * langue de l'application. Le détail technique reste dans la console du
     * développeur, où il a son utilité.
     */
    return { disponible: false, texte: '', raison: raisonIndisponibilite() };
  }
}

/**
 * Choisir une image de sa carte, et en tirer du texte.
 *
 * Le geste demandé est le plus simple qui soit : **prendre une photo, ou en choisir
 * une déjà dans le téléphone**, et laisser l'application remplir le formulaire. Pas
 * de recopie de trente caractères, pas de saisie champ par champ.
 *
 * Ce module réunit les deux moitiés de ce geste :
 *
 *     choisir une image  →  en extraire le texte  →  décoder  →  formulaire
 *     ^^^^^^^^^^^^^^^^^     ^^^^^^^^^^^^^^^^^^^^
 *            ici                    ici
 *
 * Le décodage, lui, vit dans `cnib.ts` (le dos) et `cnibRecto.ts` (le recto).
 *
 * ## Où l'on peut lire, et où l'on ne peut pas
 *
 * L'extraction du texte demande un moteur de reconnaissance de caractères. Sur
 * téléphone, c'est celui du système — Vision chez Apple, ML Kit chez Google —
 * atteint par un module natif qui **n'existe pas dans Expo Go**. Il faut une
 * application construite (`eas build`), et alors tout fonctionne hors ligne.
 *
 * L'application ne fait donc pas semblant : elle dit lequel des deux cas s'applique,
 * et propose toujours une issue. Choisir l'image marche partout, y compris dans Expo
 * Go et sur le web ; c'est seulement la lecture automatique qui attend le module.
 */

import * as ImagePicker from 'expo-image-picker';
import { lireTexteImage } from './ocr';
import { lireBandeTD1, extraireBandeDepuisTexte, type IdentiteLue } from './cnib';
import { lireRectoCnib, rectoExploitable, type IdentiteRecto } from './cnibRecto';

export type FaceCarte = 'RECTO' | 'VERSO';

export interface LectureFace {
  face: FaceCarte;
  /** Chemin local de l'image retenue. Reste sur l'appareil. */
  uri: string;
  /** Texte brut rendu par la reconnaissance, conservé pour diagnostic. */
  texte: string;
  /** Renseigné quand la reconnaissance n'a pas pu avoir lieu. */
  raisonIndisponible?: string;
  /** Identité décodée depuis la bande, quand la face lue est le dos. */
  bande?: IdentiteLue;
  /** Avertissements des clés de contrôle. */
  avertissements: string[];
  /** Champs lus au recto. */
  recto?: IdentiteRecto;
}

/**
 * Ouvre la galerie du téléphone. Les images ne sont jamais copiées ailleurs : on
 * reçoit un chemin local, et c'est tout ce dont on a besoin.
 */
export async function choisirDepuisGalerie(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      "L'accès à vos photos a été refusé. Autorisez-le dans les réglages du téléphone, ou prenez la photo directement.",
    );
  }

  const resultat = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // Pas de recadrage imposé : une carte mal recadrée perd sa bande, et c'est
    // précisément la partie qui porte les clés de contrôle.
    allowsEditing: false,
    quality: 1,
    exif: false,
  });

  if (resultat.canceled) return null;
  return resultat.assets[0]?.uri ?? null;
}

/** Ouvre l'appareil photo du système, avec le même contrat. */
export async function photographier(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      "L'accès à l'appareil photo a été refusé. Autorisez-le dans les réglages du téléphone, ou choisissez une photo existante.",
    );
  }

  const resultat = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    exif: false,
  });

  if (resultat.canceled) return null;
  return resultat.assets[0]?.uri ?? null;
}

/**
 * Lit une image de carte.
 *
 * La face n'est pas demandée à l'utilisateur : **elle se déduit du contenu**. Si le
 * texte contient une bande de trois lignes de trente caractères, c'est le dos ; les
 * étiquettes « Nom : », « Expire le : » désignent le recto. Demander « est-ce le
 * recto ou le verso ? » serait une question de plus, à laquelle l'image répond déjà.
 */
export async function lireImageCarte(uri: string): Promise<LectureFace> {
  const reconnaissance = await lireTexteImage(uri);

  if (!reconnaissance.disponible) {
    return {
      face: 'RECTO',
      uri,
      texte: '',
      raisonIndisponible: reconnaissance.raison,
      avertissements: [],
    };
  }

  const texte = reconnaissance.texte;

  // Le dos d'abord : c'est la lecture la plus sûre, et la plus reconnaissable.
  const bandeTrouvee = extraireBandeDepuisTexte(texte);
  if (bandeTrouvee) {
    const decodee = lireBandeTD1(bandeTrouvee);
    if (decodee.ok) {
      return {
        face: 'VERSO',
        uri,
        texte,
        bande: decodee.identite,
        avertissements: decodee.avertissements,
      };
    }
    return { face: 'VERSO', uri, texte, avertissements: [decodee.raison] };
  }

  // Sinon le recto, par ses étiquettes.
  const recto = lireRectoCnib(texte);
  if (rectoExploitable(recto)) {
    return { face: 'RECTO', uri, texte, recto, avertissements: [] };
  }

  return {
    face: 'RECTO',
    uri,
    texte,
    avertissements: [
      "Aucune information de carte d'identité n'a été reconnue sur cette image. Reprenez-la bien à plat, bien éclairée, et cadrée sur la carte entière.",
    ],
  };
}

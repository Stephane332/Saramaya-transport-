/**
 * Scanner de code-barres — version appareil.
 *
 * Ouvre réellement la caméra et lit le code-barres (ou le QR) du ticket. Le
 * code-barres d'un ticket papier ne contient que son numéro : on le remonte à
 * l'appelant, qui demande ensuite au voyageur de confirmer le reste depuis son
 * ticket. Rien n'est deviné.
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Bouton, MessageErreur, Txt } from './base';
import { useAction } from '../lib/action';
import { couleurs, espace, rayon } from '../theme';

export function ScannerCamera({
  onScan,
  onSaisieManuelle,
}: {
  onScan: (valeur: string) => void;
  onSaisieManuelle: () => void;
}) {
  const [permission, demanderPermission] = useCameraPermissions();
  const [verrouille, setVerrouille] = useState(false);

  /*
   * La demande d'autorisation est asynchrone : lancée telle quelle depuis un
   * `onPress`, un refus ou une erreur du système ne se voyait nulle part, et le
   * bouton semblait ne rien faire.
   */
  const acces = useAction(async () => {
    const accord = await demanderPermission();
    if (!accord.granted) {
      throw new Error(
        "La caméra a été refusée. Autorisez-la dans les réglages du téléphone, ou saisissez le numéro du ticket à la main.",
      );
    }
  }, "La caméra n'a pas pu être ouverte. Saisissez le numéro du ticket à la main.");

  if (!permission) {
    return <View style={styles.viseur} />;
  }

  if (!permission.granted) {
    return (
      <View style={{ gap: espace.md }}>
        <View style={styles.viseur}>
          <Txt v="petit" couleur={couleurs.texteFaible} style={{ textAlign: 'center' }}>
            Autorisez la caméra pour scanner le code-barres de votre ticket.
          </Txt>
        </View>
        <MessageErreur texte={acces.erreur} />
        <Bouton
          titre={acces.enCours ? 'Demande…' : 'Autoriser la caméra'}
          desactive={acces.enCours}
          onPress={acces.lancer}
        />
        <Bouton titre="Saisir à la main" variante="secondaire" onPress={onSaisieManuelle} />
      </View>
    );
  }

  return (
    <View style={{ gap: espace.md }}>
      <View style={styles.viseur}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{
            barcodeTypes: ['code39', 'code128', 'ean13', 'ean8', 'qr', 'codabar'],
          }}
          onBarcodeScanned={
            verrouille
              ? undefined
              : ({ data }) => {
                  setVerrouille(true);
                  onScan(data);
                }
          }
        />
        <View style={styles.cadre} pointerEvents="none" />
      </View>
      <Txt v="petit" couleur={couleurs.texteFaible} style={{ textAlign: 'center' }}>
        Cadrez le code-barres imprimé sur votre ticket.
      </Txt>
      <Bouton titre="Saisir à la main" variante="secondaire" onPress={onSaisieManuelle} />
    </View>
  );
}

const styles = StyleSheet.create({
  viseur: {
    width: '100%',
    aspectRatio: 1.3,
    borderRadius: rayon.xl,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cadre: {
    width: '80%',
    height: '55%',
    borderWidth: 2,
    borderColor: couleurs.marqueVif,
    borderRadius: rayon.md,
  },
});

/**
 * Scanner — repli web.
 *
 * Le navigateur ne donne pas d'accès fiable à la caméra pour lire un code-barres
 * dans ce contexte. On invite donc à saisir le numéro à la main. Le vrai scan
 * fonctionne sur l'application installée.
 */

import { View } from 'react-native';
import { Bouton, Txt } from './base';
import { couleurs, espace, rayon } from '../theme';

export function ScannerCamera({
  onSaisieManuelle,
}: {
  onScan: (valeur: string) => void;
  onSaisieManuelle: () => void;
}) {
  return (
    <View style={{ gap: espace.md }}>
      <View
        style={{
          width: '100%',
          aspectRatio: 1.3,
          borderRadius: rayon.xl,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: couleurs.bordureForte,
          alignItems: 'center',
          justifyContent: 'center',
          padding: espace.lg,
        }}
      >
        <Txt v="petit" couleur={couleurs.texteFaible} style={{ textAlign: 'center' }}>
          Le scan par caméra fonctionne sur l'application installée. Ici, saisissez le numéro
          de votre ticket à la main.
        </Txt>
      </View>
      <Bouton titre="Saisir le ticket" onPress={onSaisieManuelle} />
    </View>
  );
}

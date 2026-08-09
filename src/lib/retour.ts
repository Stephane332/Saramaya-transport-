/**
 * Bouton retour matériel d'Android.
 *
 * Sans cela, un appui sur le retour d'Android au milieu d'une réservation quitte
 * l'onglet et perd la saisie en cours : le trajet, la date, le départ et la place
 * choisis disparaissent d'un coup. C'est le genre de détail qui décide si
 * quelqu'un réessaie ou abandonne — surtout à la gare, debout, pressé.
 *
 * Ce crochet redirige le retour matériel vers l'étape précédente. Il ne s'active
 * que lorsqu'il y a réellement quelque chose à quitter : quand `actif` est faux,
 * Android reprend son comportement normal (sortir de l'écran).
 *
 * Sur iOS et sur le web, il n'y a pas de bouton matériel : le crochet ne fait rien,
 * et c'est la flèche à l'écran qui assure le retour.
 */

import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

export function useRetourMateriel(actif: boolean, retour: () => void) {
  useEffect(() => {
    if (Platform.OS !== 'android' || !actif) return;

    const abonnement = BackHandler.addEventListener('hardwareBackPress', () => {
      retour();
      // `true` : l'évènement est consommé, Android ne ferme pas l'écran.
      return true;
    });

    return () => abonnement.remove();
  }, [actif, retour]);
}

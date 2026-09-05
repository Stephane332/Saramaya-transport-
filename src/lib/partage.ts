/**
 * Transmettre le code de retrait au destinataire.
 *
 * Seule pièce du dossier « colis » qui touche au téléphone : elle ouvre WhatsApp,
 * ou les SMS s'il n'est pas installé. Elle est isolée ici pour que les règles du
 * colis — le suivi, la relance, le message — restent du calcul pur, vérifiable
 * sans téléphone ni simulateur.
 */

import { Linking, Platform } from 'react-native';
import { messageDestinataire, numeroInternational } from './colis';
import type { Colis } from '../types';

/**
 * Ouvre WhatsApp sur la conversation du destinataire, message déjà écrit.
 * Si WhatsApp n'est pas installé, on retombe sur un SMS.
 */
export async function partagerParWhatsApp(
  colis: Colis,
  nomExpediteur: string,
): Promise<boolean> {
  const texte = messageDestinataire(colis, nomExpediteur);
  const numero = numeroInternational(colis.destinataireTelephone);
  const lien = `https://wa.me/${numero}?text=${encodeURIComponent(texte)}`;

  try {
    await Linking.openURL(lien);
    return true;
  } catch {
    const separateur = Platform.OS === 'ios' ? '&' : '?';
    try {
      await Linking.openURL(`sms:${numero}${separateur}body=${encodeURIComponent(texte)}`);
      return true;
    } catch {
      return false;
    }
  }
}

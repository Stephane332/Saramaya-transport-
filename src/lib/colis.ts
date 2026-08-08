/**
 * Le code de retrait, et sa transmission au destinataire.
 *
 * C'est le geste que la compagnie fait déjà : donner un code à l'expéditeur, qui
 * l'envoie par WhatsApp. L'application ne change pas l'habitude, elle la rend
 * fiable — le code est généré, partagé en un geste, et le destinataire est
 * prévenu quand le colis arrive réellement.
 */

import { Linking, Platform } from 'react-native';
import { gareParId } from '../data/reseau';
import type { Colis } from '../types';

/**
 * Alphabet sans caractères confondables : ni O/0, ni I/1, ni S/5.
 * Un code se lit à voix haute au guichet et se recopie à la main.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';

export function genererCodeRetrait(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  // Groupé par trois : SAR-4KP se retient et se dicte mieux que SAR4KP.
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/** Message prêt à envoyer au destinataire. */
export function messageDestinataire(colis: Colis, nomExpediteur: string): string {
  const depart = gareParId(colis.gareDepartId);
  const arrivee = gareParId(colis.gareArriveeId);

  return [
    `Bonjour ${colis.destinataireNom},`,
    ``,
    `${nomExpediteur} vous envoie un colis par Saramaya Transport.`,
    ``,
    `Code de retrait : ${colis.codeRetrait}`,
    `Référence : ${colis.reference}`,
    ``,
    `Départ : ${depart?.nom ?? '—'}`,
    `À retirer : ${arrivee?.nom ?? '—'}`,
    arrivee?.telephones[0] ? `Téléphone de la gare : ${arrivee.telephones[0]}` : null,
    ``,
    `Présentez ce code et une pièce d'identité au guichet.`,
    `Vous serez prévenu dès que le colis arrive.`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/** Numéro au format international attendu par WhatsApp (Burkina Faso : 226). */
export function numeroInternational(telephone: string): string {
  const chiffres = telephone.replace(/\D/g, '');
  if (chiffres.startsWith('226')) return chiffres;
  return `226${chiffres}`;
}

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

/** Position du colis dans le suivi, pour dessiner la frise. */
export function etapeCourante(statut: Colis['statut']): number {
  switch (statut) {
    case 'DEPOSE':
      return 0;
    case 'EN_TRANSIT':
      return 1;
    case 'ARRIVE':
      return 2;
    case 'RETIRE':
      return 3;
    default:
      return 0;
  }
}

/**
 * Un colis arrivé mais non retiré depuis longtemps devient un encombrement pour
 * la gare : on relance le destinataire, puis l'expéditeur.
 */
export function relanceNecessaire(colis: Colis, maintenant = new Date()): boolean {
  if (colis.statut !== 'ARRIVE' || !colis.arriveLe) return false;
  const heures = (maintenant.getTime() - new Date(colis.arriveLe).getTime()) / 3600000;
  return heures >= 48;
}

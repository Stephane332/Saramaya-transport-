/**
 * Le code de retrait, et sa transmission au destinataire.
 *
 * C'est le geste que la compagnie fait déjà : donner un code à l'expéditeur, qui
 * l'envoie par WhatsApp. L'application ne change pas l'habitude, elle la rend
 * fiable — le code est généré, transmis en un geste, et le colis se suit du dépôt
 * jusqu'au retrait.
 *
 * Tout ce fichier est du calcul pur : aucune dépendance au téléphone, donc tout
 * est vérifiable par `npm test`. L'ouverture de WhatsApp, elle, vit dans
 * `partage.ts`.
 */

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
    /*
     * Aucune promesse d'alerte automatique : le destinataire n'a pas cette
     * application, et la compagnie seule peut le prévenir. On donne donc ce qui
     * marche vraiment aujourd'hui — le numéro de la gare, écrit plus haut.
     */
    arrivee?.telephones[0]
      ? `Vous pouvez appeler la gare pour savoir si le colis est arrivé.`
      : null,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/**
 * Numéro au format international attendu par WhatsApp (Burkina Faso : 226).
 *
 * Trois écritures circulent pour le même numéro — `70451288`, `22670451288` et
 * `0022670451288` — et la troisième piégeait la conversion : ne commençant pas par
 * « 226 », elle recevait l'indicatif une seconde fois. Le lien produit,
 * `wa.me/22600226…`, est refusé par WhatsApp, et le code de retrait ne partait pas.
 *
 * On retire donc d'abord le préfixe international `00` ou `+`, puis on n'ajoute
 * l'indicatif que s'il manque vraiment.
 */
export function numeroInternational(telephone: string): string {
  const chiffres = telephone.replace(/\D/g, '').replace(/^00/, '');
  if (chiffres.startsWith('226')) return chiffres;
  return `226${chiffres}`;
}

/** Position du colis dans le suivi, pour dessiner la frise. */
export function etapeCourante(statut: Colis['statut']): number {
  switch (statut) {
    case 'A_DEPOSER':
      return 0;
    case 'DEPOSE':
      return 1;
    case 'EN_TRANSIT':
      return 2;
    case 'ARRIVE':
      return 3;
    case 'RETIRE':
      return 4;
    default:
      // Retour à l'expéditeur : le parcours normal s'arrête, on reste au dépôt.
      return 1;
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

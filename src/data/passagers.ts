/**
 * Manifeste de démonstration pour l'écran gare.
 *
 * Les états sont répartis pour montrer ce que l'agent voit réellement : une
 * majorité de réponses obtenues sans un seul appel, et une poignée de cas —
 * seulement ceux-là — qui demandent encore de décrocher le téléphone.
 */

import type { Classe } from '../types';

export interface PassagerManifeste {
  nom: string;
  telephone: string;
  siege: number;
  classe: Classe;
  etat: 'CONFIRME' | 'PAYE_NON_CONFIRME' | 'SANS_REPONSE' | 'ANNULE' | 'INJOIGNABLE' | 'EMBARQUE';
  montant: number;
  notificationDelivree: boolean;
}

const NOMS = [
  'SAWADOGO Ange', 'OUEDRAOGO Fatimata', 'KABORE Boukary', 'COMPAORE Aminata',
  'ZONGO Issouf', 'TRAORE Mariam', 'KONE Salifou', 'SANOU Awa',
  'BARRY Ousmane', 'DIALLO Kadiatou', 'NIKIEMA Rasmane', 'ILBOUDO Céline',
  'TAPSOBA Adama', 'KAFANDO Bintou', 'YAMEOGO Paul', 'BANCE Rokia',
  'SORE Idrissa', 'OUATTARA Safiatou', 'DERME Hamado', 'ZOUNGRANA Alizeta',
  'NACOULMA Karim', 'PARE Djeneba', 'SEDOGO Moussa', 'BELEM Hawa',
  'GUIRA Abdoul', 'MILLOGO Estelle', 'DABIRE Vincent', 'SOME Clarisse',
  'KY Emmanuel', 'BAMOGO Assetou', 'LOMPO Souleymane', 'THIOMBIANO Rachel',
  'NEBIE Boureima', 'OUEDRAOGO Salamata', 'KOROGHO Daouda', 'SAWADOGO Nafissatou',
  'ZERBO Lassane', 'KIENDREBEOGO Aïcha', 'TIENDREBEOGO Noaga', 'COULIBALY Fanta',
];

/**
 * Répartition retenue : 26 confirmations obtenues dans l'application,
 * 6 payés qui n'ont pas encore répondu, 3 sans réponse, 3 annulations,
 * 2 injoignables. Seuls ces deux derniers justifient un appel.
 */
const ETATS: PassagerManifeste['etat'][] = [
  ...Array<PassagerManifeste['etat']>(26).fill('CONFIRME'),
  ...Array<PassagerManifeste['etat']>(6).fill('PAYE_NON_CONFIRME'),
  ...Array<PassagerManifeste['etat']>(3).fill('SANS_REPONSE'),
  ...Array<PassagerManifeste['etat']>(3).fill('ANNULE'),
  ...Array<PassagerManifeste['etat']>(2).fill('INJOIGNABLE'),
];

export function manifesteDemo(classe: Classe, tarif: number): PassagerManifeste[] {
  return NOMS.map((nom, i) => {
    const etat = ETATS[i % ETATS.length];
    return {
      nom,
      telephone: `${[66, 70, 76, 78, 65, 71][i % 6]}${String(((i + 3) * 486731) % 900000 + 100000)}`,
      siege: i + 1,
      classe,
      etat,
      montant: tarif,
      notificationDelivree: etat !== 'INJOIGNABLE',
    };
  });
}

export const ETIQUETTES_ETAT: Record<
  PassagerManifeste['etat'],
  { texte: string; couleur: string; icone: string }
> = {
  CONFIRME: { texte: 'Confirmé', couleur: '#2ECC8F', icone: 'checkmark-circle' },
  PAYE_NON_CONFIRME: { texte: 'Payé', couleur: '#5B8DEF', icone: 'card' },
  SANS_REPONSE: { texte: 'Sans réponse', couleur: '#F5A524', icone: 'help-circle' },
  ANNULE: { texte: 'Annulé', couleur: '#F2545B', icone: 'close-circle' },
  INJOIGNABLE: { texte: 'À appeler', couleur: '#F04E37', icone: 'call' },
  EMBARQUE: { texte: 'Embarqué', couleur: '#7C7188', icone: 'bus' },
};

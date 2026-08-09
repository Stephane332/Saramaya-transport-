/**
 * Vérification des règles de calcul de l'application.
 *
 * Ces contrôles s'exécutent sur le vrai code source — rien n'est recopié ni
 * adapté pour les besoins du test. Ils portent sur ce qui, en cas d'erreur,
 * coûterait une place à un voyageur ou afficherait une bêtise sur un billet :
 * l'heure de convocation, la liste des départs encore atteignables, et l'unicité
 * des identifiants.
 *
 *   npm test
 */

import { decalerHeure, departsAVenir, estAujourdhui, joursAvantExpiration } from '../src/lib/format';
import { departsDuJour } from '../src/lib/departs';
import {
  estReferenceApplication,
  identifiant,
  referenceBillet,
} from '../src/lib/identifiants';

let reussis = 0;
let echoues = 0;

function verifier(nom: string, obtenu: unknown, attendu: unknown) {
  const a = JSON.stringify(obtenu);
  const b = JSON.stringify(attendu);
  if (a === b) {
    reussis += 1;
    console.log(`  ok    ${nom}`);
  } else {
    echoues += 1;
    console.log(`  ÉCHEC ${nom}\n        obtenu  ${a}\n        attendu ${b}`);
  }
}

function groupe(titre: string) {
  console.log(`\n${titre}`);
}

/* ── Heures ──────────────────────────────────────────────────────────────── */

groupe('decalerHeure — convocation et passages de minuit');
verifier('convocation 30 min avant 16:00', decalerHeure('16:00', -30), '15:30');
verifier('passage de minuit vers la veille', decalerHeure('00:10', -30), '23:40');
verifier('passage de minuit vers le lendemain', decalerHeure('23:50', 30), '00:20');
verifier('décalage supérieur à une journée', decalerHeure('06:00', -2000), '20:40');
// Une heure illisible peut venir d'un ticket papier scanné de travers : on ne
// doit jamais imprimer « NaN:NaN » sur le billet de quelqu'un.
verifier('heure malformée rendue telle quelle', decalerHeure('ab:cd', -30), 'ab:cd');
verifier('heure vide rendue telle quelle', decalerHeure('', -30), '');

/* ── Départs du jour ─────────────────────────────────────────────────────── */

const midi = new Date('2026-08-09T12:00:00');
const grille = [{ heure: '08:00' }, { heure: '12:30' }, { heure: '18:30' }];

groupe('departsAVenir — temps réel');
verifier(
  "aujourd'hui, les départs passés disparaissent",
  departsAVenir(grille, '2026-08-09', midi).map((d) => d.heure),
  ['12:30', '18:30'],
);
verifier(
  'un autre jour, la grille reste entière',
  departsAVenir(grille, '2026-08-10', midi).map((d) => d.heure),
  ['08:00', '12:30', '18:30'],
);
verifier('estAujourdhui', estAujourdhui('2026-08-09', midi), true);

groupe('departsDuJour — ajouts de la compagnie');
const publies = [
  { heure: '08:00', classe: 'ORDINAIRE' as const },
  { heure: '18:30', classe: 'VIP_1RE' as const },
];
const ajouts = [
  { ligneId: 'L1', date: '2026-08-09', heure: '20:00', classe: 'ORDINAIRE' as const },
  { ligneId: 'L1', date: '2026-08-09', heure: '18:30', classe: 'ORDINAIRE' as const },
  { ligneId: 'L2', date: '2026-08-09', heure: '21:00', classe: 'ORDINAIRE' as const },
  { ligneId: 'L1', date: '2026-08-10', heure: '22:00', classe: 'ORDINAIRE' as const },
];
const fusion = departsDuJour(publies, 'L1', '2026-08-09', ajouts, midi);
verifier(
  'fusion triée, passés retirés, ajout marqué',
  fusion.map((d) => `${d.heure}${d.ajoute ? '+' : ''}`),
  ['18:30', '20:00+'],
);
verifier('un ajout ne remplace pas un départ publié', fusion[0]?.classe, 'VIP_1RE');
verifier(
  "ajout d'une autre ligne ignoré",
  fusion.some((d) => d.heure === '21:00'),
  false,
);
verifier(
  "ajout d'un autre jour ignoré",
  fusion.some((d) => d.heure === '22:00'),
  false,
);
verifier(
  'sans ajout, la grille publiée suffit',
  departsDuJour(publies, 'L1', '2026-08-11', [], midi).map((d) => d.heure),
  ['08:00', '18:30'],
);

/* ── Identifiants ────────────────────────────────────────────────────────── */

groupe('identifiants — deux billets ne doivent jamais se confondre');
const ids = new Set(Array.from({ length: 20000 }, () => identifiant('res')));
verifier('20 000 identifiants, aucune collision', ids.size, 20000);
const refs = new Set(Array.from({ length: 20000 }, () => referenceBillet()));
verifier('références distinctes à plus de 99,9 %', refs.size > 19980, true);
verifier('notre référence est reconnue', estReferenceApplication(referenceBillet()), true);
// Le ticket papier réel portait le numéro 66456 : jamais l'application ne doit
// produire une référence qu'un agent pourrait recopier dans leur billetterie.
verifier('un numéro de billetterie ne passe pas pour le nôtre', estReferenceApplication('66456'), false);

/* ── Expiration ──────────────────────────────────────────────────────────── */

groupe('expiration — validité de 30 jours');
verifier(
  'sept jours restants',
  joursAvantExpiration('2026-08-16T12:00:00.000Z', new Date('2026-08-09T12:00:00.000Z')),
  7,
);
verifier(
  'billet expiré : compte négatif',
  joursAvantExpiration('2026-08-01T12:00:00.000Z', new Date('2026-08-09T12:00:00.000Z')),
  -8,
);

console.log(`\n${reussis} réussis, ${echoues} échoués\n`);
process.exit(echoues > 0 ? 1 : 0);

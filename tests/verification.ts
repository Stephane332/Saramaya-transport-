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
import { construireQrBillet, verifierQrBillet } from '../src/lib/billetQr';
import {
  depuisBase64Url,
  hmacSha256,
  sha256,
  versBase64Url,
  versHex,
  versOctets,
  versTexte,
} from '../src/lib/sha256';
import type { Reservation, Voyageur } from '../src/types';

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

/* ── Signature cryptographique ───────────────────────────────────────────── */

groupe('SHA-256 et HMAC — vecteurs officiels');
// Une erreur d'un seul bit ici invaliderait toutes les signatures de billets sans
// que rien d'autre ne le signale. On confronte donc aux vecteurs de référence.
verifier(
  'FIPS 180-4 : chaîne vide',
  versHex(sha256(versOctets(''))),
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
);
verifier(
  'FIPS 180-4 : "abc"',
  versHex(sha256(versOctets('abc'))),
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
);
verifier(
  'FIPS 180-4 : message de 448 bits',
  versHex(sha256(versOctets('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))),
  '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
);
verifier(
  'RFC 4231 cas 1',
  versHex(hmacSha256(new Uint8Array(20).fill(0x0b), versOctets('Hi There'))),
  'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
);
verifier(
  'RFC 4231 cas 2',
  versHex(hmacSha256(versOctets('Jefe'), versOctets('what do ya want for nothing?'))),
  '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
);
verifier(
  'RFC 4231 cas 6 — clé de 131 octets',
  versHex(
    hmacSha256(
      new Uint8Array(131).fill(0xaa),
      versOctets('Test Using Larger Than Block-Size Key - Hash Key First'),
    ),
  ),
  '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54',
);
verifier(
  'UTF-8 : les accents survivent à l\'aller-retour',
  versTexte(versOctets('Ouahigouya → Ouaga, 3 500 F, café')),
  'Ouahigouya → Ouaga, 3 500 F, café',
);
verifier(
  'base64url : aller-retour fidèle',
  versTexte(depuisBase64Url(versBase64Url(versOctets('Bonjour Ange !')))),
  'Bonjour Ange !',
);

/* ── Le billet vu par le contrôleur ──────────────────────────────────────── */

groupe('QR du billet — ce que voit le contrôleur à la porte');

const LE_JOUR = new Date('2026-08-09T07:30:00');
const voyageurTest: Voyageur = {
  id: 'v-1',
  nom: 'SAWADOGO',
  prenom: 'Ange',
  telephone: '66798031',
};
const billetDeBase: Reservation = {
  id: 'res-1',
  reference: 'SB-7K2Q4M',
  voyageurId: 'v-1',
  ligneId: 'ligne-ouahigouya-ouaga',
  gareDepartId: 'gare-ouahigouya',
  date: '2026-08-09',
  heure: '16:00',
  convocation: '15:30',
  classe: 'ORDINAIRE',
  siege: 93,
  montant: 3500,
  statut: 'PAYEE',
  supports: ['NUMERIQUE'],
  creeLe: '2026-08-09T06:00:00.000Z',
  expireLe: '2026-09-08T06:00:00.000Z',
};

const qrPaye = construireQrBillet(billetDeBase, voyageurTest);
const controlePaye = verifierQrBillet(qrPaye, LE_JOUR);
verifier('billet payé du jour : valide', controlePaye.verdict, 'VALIDE');
verifier('le siège est lisible sans réseau', controlePaye.billet?.s, 93);
verifier('le nom est lisible sans réseau', controlePaye.billet?.n, 'SAWADOGO Ange');
verifier('le montant est lisible sans réseau', controlePaye.billet?.m, 3500);

// Le cas décisif : quelqu'un modifie le QR pour se faire passer pour payé.
const falsifie = (() => {
  const [v, charge, signature] = qrPaye.split('.') as [string, string, string];
  const contenu = JSON.parse(versTexte(depuisBase64Url(charge)));
  contenu.s = 1; // il se donne le siège 1
  return `${v}.${versBase64Url(versOctets(JSON.stringify(contenu)))}.${signature}`;
})();
verifier(
  'siège modifié : falsification détectée',
  verifierQrBillet(falsifie, LE_JOUR).verdict,
  'SIGNATURE_INVALIDE',
);
verifier(
  'signature tronquée : refusée',
  verifierQrBillet(qrPaye.slice(0, -3), LE_JOUR).verdict,
  'SIGNATURE_INVALIDE',
);
verifier(
  'code étranger : reconnu comme tel',
  verifierQrBillet('https://exemple.test/quelque-chose', LE_JOUR).verdict,
  'ILLISIBLE',
);

verifier(
  'billet non payé : signalé, pas rejeté comme faux',
  verifierQrBillet(construireQrBillet({ ...billetDeBase, statut: 'OPTION' }, voyageurTest), LE_JOUR)
    .verdict,
  'NON_PAYE',
);
verifier(
  'réservation annulée : signalée',
  verifierQrBillet(construireQrBillet({ ...billetDeBase, statut: 'ANNULEE' }, voyageurTest), LE_JOUR)
    .verdict,
  'ANNULE',
);
verifier(
  "billet d'un autre jour : signalé",
  verifierQrBillet(construireQrBillet({ ...billetDeBase, date: '2026-08-12' }, voyageurTest), LE_JOUR)
    .verdict,
  'MAUVAIS_JOUR',
);
verifier(
  'billet expiré : signalé',
  verifierQrBillet(
    construireQrBillet({ ...billetDeBase, expireLe: '2026-08-01T00:00:00.000Z' }, voyageurTest),
    LE_JOUR,
  ).verdict,
  'EXPIRE',
);
// Un QR trop long devient illisible de loin, à bout de bras, par mauvaise lumière.
verifier('le QR reste court (moins de 300 caractères)', qrPaye.length < 300, true);

console.log(`\n${reussis} réussis, ${echoues} échoués\n`);
process.exit(echoues > 0 ? 1 : 0);

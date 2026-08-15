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
  cleControle,
  extraireBandeDepuisTexte,
  joursAvantExpirationCnib,
  lireBandeTD1,
} from '../src/lib/cnib';
import { actionsPossibles, billetEmis, etapeReservation } from '../src/lib/parcours';
import {
  etapeCourante,
  messageDestinataire,
  numeroInternational,
  relanceNecessaire,
} from '../src/lib/colis';
import { migrerEtat } from '../src/store/migration';
import { creerVerrou } from '../src/lib/verrou';
import { calculerFidelite, phraseHabitue } from '../src/lib/fidelite';
import {
  depuisBase64Url,
  hmacSha256,
  sha256,
  versBase64Url,
  versHex,
  versOctets,
  versTexte,
} from '../src/lib/sha256';
import type { Colis, Reservation, Voyageur } from '../src/types';

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

// Depuis que le billet n'est émis qu'une fois le paiement établi, ces deux cas ne
// produisent plus de QR du tout — garantie plus forte que de le signaler à la porte.
// Les verdicts NON_PAYE et ANNULE restent dans le vérificateur : ils défendent contre
// un code émis par une version antérieure ou par un autre outil.
verifier(
  'une réservation impayée ne produit aucun code à présenter',
  construireQrBillet({ ...billetDeBase, statut: 'OPTION' }, voyageurTest),
  '',
);
verifier(
  'une réservation annulée ne produit aucun code à présenter',
  construireQrBillet({ ...billetDeBase, statut: 'ANNULEE' }, voyageurTest),
  '',
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


/* ── Pièce d'identité ────────────────────────────────────────────────────── */

groupe("CNIB — lecture de la bande au dos (format TD1)");

// Spécimen officiel de l'OACI (Doc 9303, partie 5), clés de contrôle publiées.
const SPECIMEN_OACI = [
  'I<UTOD231458907<<<<<<<<<<<<<<<',
  '7408122F1204159UTO<<<<<<<<<<<6',
  'ERIKSSON<<ANNA<MARIA<<<<<<<<<<',
].join('\n');

const lecture = lireBandeTD1(SPECIMEN_OACI, LE_JOUR);
verifier('spécimen officiel décodé', lecture.ok, true);
if (lecture.ok) {
  verifier('numéro de la carte', lecture.identite.numero, 'D23145890');
  verifier('nom', lecture.identite.nom, 'ERIKSSON');
  verifier('prénoms', lecture.identite.prenoms, 'ANNA MARIA');
  verifier('date de naissance', lecture.identite.dateNaissance, '1974-08-12');
  // Ce spécimen est une carte expirée : elle doit le rester, et non basculer en 2112.
  verifier("date d'expiration d'une carte ancienne", lecture.identite.dateExpiration, '2012-04-15');
  verifier('sexe', lecture.identite.sexe, 'F');
  verifier('aucun avertissement quand les clés concordent', lecture.avertissements, []);
}

verifier('clé de contrôle du numéro', cleControle('D23145890'), 7);
verifier('clé de contrôle de la naissance', cleControle('740812'), 2);
verifier('clé de contrôle de l\'expiration', cleControle('120415'), 9);

// Une lecture fautive doit être signalée, jamais enregistrée en silence.
const abimee = lireBandeTD1(SPECIMEN_OACI.replace('7408122F', '7408123F'), LE_JOUR);
verifier(
  'chiffre de contrôle faux : averti, pas avalé',
  abimee.ok && abimee.avertissements.length > 0,
  true,
);
verifier('deux lignes au lieu de trois : refusé', lireBandeTD1('AAA\nBBB', LE_JOUR).ok, false);
verifier(
  'lignes trop courtes : refusées',
  lireBandeTD1('I<UTO\n7408122F\nERIKSSON', LE_JOUR).ok,
  false,
);

const carteRecente = lireBandeTD1(
  [
    'I<BFAD231458907<<<<<<<<<<<<<<<',
    '9001011M3012315BFA<<<<<<<<<<<4',
    'SAWADOGO<<ANGE<<<<<<<<<<<<<<<<',
  ].join('\n'),
  LE_JOUR,
);
if (carteRecente.ok) {
  verifier('naissance « 90 » comprise comme 1990', carteRecente.identite.dateNaissance, '1990-01-01');
  verifier('expiration « 30 » comprise comme 2030', carteRecente.identite.dateExpiration, '2030-12-31');
}

verifier('CNIB expirant dans sept jours', joursAvantExpirationCnib('2026-08-16', LE_JOUR), 7);
verifier('CNIB déjà expirée', joursAvantExpirationCnib('2026-08-01', LE_JOUR), -8);


/* ── L'ordre des étapes ──────────────────────────────────────────────────── */

groupe("Parcours — ce qui ne doit pas arriver avant d'avoir payé");

const enAttente = { ...billetDeBase, statut: 'OPTION' as const };
const declare = { ...enAttente, paiementDeclareLe: '2026-08-09T07:00:00.000Z' };
const paye = { ...billetDeBase, statut: 'PAYEE' as const };
const effectue = { ...billetDeBase, statut: 'EMBARQUE' as const };
const annule = { ...billetDeBase, statut: 'ANNULEE' as const };

verifier('réservation non payée : étape « à payer »', etapeReservation(enAttente), 'A_PAYER');
verifier('paiement déclaré : étape distincte', etapeReservation(declare), 'PAIEMENT_DECLARE');
verifier('réservation payée : billet émis', etapeReservation(paye), 'BILLET_EMIS');

// La règle centrale, sous ses trois formes.
verifier('aucun billet tant que ce n\'est pas payé', billetEmis(enAttente), false);
verifier('une déclaration de paiement ne vaut pas un billet', billetEmis(declare), false);
verifier('billet émis une fois le paiement établi', billetEmis(paye), true);

// Et la garde au niveau du QR lui-même : impossible de contourner par l'affichage.
verifier(
  'aucun QR fabriqué pour une réservation impayée',
  construireQrBillet(enAttente, voyageurTest),
  '',
);
verifier(
  'aucun QR fabriqué sur simple déclaration de paiement',
  construireQrBillet(declare, voyageurTest),
  '',
);
verifier(
  'QR fabriqué une fois le paiement établi',
  construireQrBillet(paye, voyageurTest).startsWith('SB1.'),
  true,
);

verifier(
  'on ne déclare pas deux fois son paiement',
  actionsPossibles(declare).declarerPaiement,
  false,
);
verifier(
  'un voyage effectué ne se reporte plus',
  actionsPossibles(effectue).reporter,
  false,
);
verifier(
  'un billet passé reste consultable',
  actionsPossibles(effectue).afficherBillet,
  true,
);
verifier(
  "une réservation annulée n'affiche pas de billet",
  actionsPossibles(annule).afficherBillet,
  false,
);
verifier(
  'une annulation peut être reprise',
  actionsPossibles(annule).reprendre,
  true,
);
verifier(
  "on n'annule pas un voyage déjà effectué",
  actionsPossibles(effectue).annuler,
  false,
);


groupe("CNIB — retrouver la bande dans une lecture de photo");

// Ce qu'une reconnaissance de caractères rend vraiment : tout ce qu'elle a vu sur la
// carte, dans le désordre, la bande noyée au milieu.
const LECTURE_BRUTE = [
  'BURKINA FASO',
  'CARTE NATIONALE D IDENTITE BURKINABE',
  'Nom / Surname  ERIKSSON',
  '',
  'I<UTOD231458907<<<<<<<<<<<<<<<',
  '7408122F1204159UTO<<<<<<<<<<<6',
  'ERIKSSON<<ANNA<MARIA<<<<<<<<<<',
  '',
  'Signature du titulaire',
].join('\n');

const trouvee = extraireBandeDepuisTexte(LECTURE_BRUTE);
verifier('bande retrouvée au milieu du reste', trouvee !== null, true);
if (trouvee) {
  const decodee = lireBandeTD1(trouvee, LE_JOUR);
  verifier('et décodable sans avertissement', decodee.ok && decodee.avertissements.length === 0, true);
}

// Les espaces parasites sont fréquents : la machine coupe les suites de chevrons.
verifier(
  'espaces parasites tolérés',
  extraireBandeDepuisTexte(LECTURE_BRUTE.replace('I<UTOD', 'I< UTO D')) !== null,
  true,
);
verifier(
  "aucune bande dans un texte quelconque : rien n'est inventé",
  extraireBandeDepuisTexte('Bonjour, ceci est un ticket de bus ordinaire.'),
  null,
);


/* ── Fidélité ────────────────────────────────────────────────────────────── */

groupe("Fidélité — ce que l'application sait d'un habitué, sans rien transmettre");

const fait = (n: number, extra: Partial<Reservation> = {}): Reservation => ({
  ...billetDeBase,
  id: `res-${n}`,
  statut: 'EMBARQUE',
  ...extra,
});

const historique: Reservation[] = [
  fait(1, { siege: 93, date: '2026-05-01' }),
  fait(2, { siege: 93, date: '2026-06-02' }),
  fait(3, { siege: 12, date: '2026-07-03' }),
  fait(4, { ligneId: 'ligne-ouaga-bobo', montant: 6500, siege: 5, date: '2026-08-04' }),
  // Ni les réservations en cours ni les annulations ne comptent comme des voyages.
  { ...billetDeBase, id: 'res-5', statut: 'OPTION' },
  { ...billetDeBase, id: 'res-6', statut: 'ANNULEE' },
];

const f = calculerFidelite(historique);
verifier('seuls les voyages effectués comptent', f.voyages, 4);
verifier('total réellement dépensé', f.totalDepense, 3500 * 3 + 6500);
// Trois fois Ouahigouya–Ouaga (182 km) et une fois Ouaga–Bobo (356 km).
verifier('kilomètres parcourus, distances réelles', f.kilometres, 182 * 3 + 356);
verifier('ligne habituelle', f.ligneHabituelle, 'ligne-ouahigouya-ouaga');
verifier('siège préféré', f.siegePrefere, 93);
verifier('dernier voyage', f.dernierVoyage, '2026-08-04');

verifier('phrase de reconnaissance pour un habitué', phraseHabitue(f) !== null, true);
// On ne dit pas « votre trajet habituel » à quelqu'un venu une seule fois.
verifier(
  'aucune phrase après un seul voyage',
  phraseHabitue(calculerFidelite([fait(1)])),
  null,
);
verifier(
  'historique vide : aucun compteur inventé',
  calculerFidelite([]).voyages,
  0,
);

/* ── Colis : préparer n'est pas déposer, et déposer n'est pas payer ───────── */

groupe("Colis — l'application prépare, le guichet dépose et encaisse");

const colisPrepare: Colis = {
  id: 'colis-1',
  reference: 'SB-A1B2C3',
  codeRetrait: 'ABC-123',
  expediteurId: 'v-1',
  destinataireNom: 'OUEDRAOGO Fatimata',
  destinataireTelephone: '70451288',
  gareDepartId: 'gare-ouaga-gounghin',
  gareArriveeId: 'gare-bobo-tounouma',
  taille: 'PETIT',
  description: 'Documents',
  valeurDeclaree: 0,
  montant: 2500,
  statut: 'A_DEPOSER',
  prepareLe: '2026-08-14T10:00:00.000Z',
  codePartage: false,
  moyenPaiement: 'ORANGE_MONEY',
};

// La frise démarre à « À déposer » : rien n'est franchi tant que le colis n'a pas
// été remis. Auparavant, préparer un envoi l'affichait « Déposé » sur-le-champ.
verifier('un envoi préparé n’est franchi d’aucune étape de transport', etapeCourante('A_DEPOSER'), 0);
verifier('déposé vient après', etapeCourante('DEPOSE'), 1);
verifier('en transit', etapeCourante('EN_TRANSIT'), 2);
verifier('arrivé', etapeCourante('ARRIVE'), 3);
verifier('retiré', etapeCourante('RETIRE'), 4);

// Une relance n'a de sens que sur un colis réellement arrivé et qui traîne.
verifier('aucune relance sur un colis pas encore déposé', relanceNecessaire(colisPrepare), false);
verifier(
  'relance après 48 h au guichet d’arrivée',
  relanceNecessaire(
    { ...colisPrepare, statut: 'ARRIVE', arriveLe: '2026-08-10T10:00:00.000Z' },
    new Date('2026-08-14T10:00:00.000Z'),
  ),
  true,
);
verifier(
  'pas de relance avant 48 h',
  relanceNecessaire(
    { ...colisPrepare, statut: 'ARRIVE', arriveLe: '2026-08-14T00:00:00.000Z' },
    new Date('2026-08-14T10:00:00.000Z'),
  ),
  false,
);

// Le message au destinataire ne promet rien que l'application ne puisse tenir :
// elle ne peut pas prévenir quelqu'un qui ne l'a pas installée.
const message = messageDestinataire(colisPrepare, 'SAWADOGO Ange');
verifier('le message porte le code de retrait', message.includes('ABC-123'), true);
verifier('et la référence', message.includes('SB-A1B2C3'), true);
verifier(
  'aucune promesse d’alerte automatique au destinataire',
  /pr[ée]venu d[èe]s que/i.test(message),
  false,
);
verifier('le numéro de la gare est indiqué à la place', message.includes('Téléphone de la gare'), true);

verifier('numéro déjà international laissé intact', numeroInternational('22670451288'), '22670451288');
verifier('indicatif ajouté sinon', numeroInternational('70 45 12 88'), '22670451288');

/* ── Migration : une mise à jour ne fait perdre aucun voyage ──────────────── */

groupe('Migration — convertir sans rien perdre');

verifier(
  'un contenu absent donne un état vide exploitable, pas une exception',
  migrerEtat(undefined, 1),
  { reservations: [], colis: [], caisse: null },
);

// Le cas réel : un colis enregistré par l'ancienne version, marqué « déposé » à la
// seconde où le formulaire avait été validé. Il redevient « à déposer », et sa date
// de création est conservée comme date de préparation.
const migre = migrerEtat(
  {
    voyageur: { id: 'v-1', nom: 'SAWADOGO', prenom: 'Ange', telephone: '70451288' },
    reservations: [billetDeBase],
    colis: [
      { ...colisPrepare, statut: 'DEPOSE', prepareLe: undefined, deposeLe: '2026-08-01T09:00:00.000Z' },
      { ...colisPrepare, id: 'colis-2', statut: 'ARRIVE', prepareLe: undefined, deposeLe: '2026-07-01T09:00:00.000Z', arriveLe: '2026-07-02T09:00:00.000Z' },
    ],
    rappelsProgrammes: {},
    caisse: null,
  },
  2,
);
const colisMigres = migre.colis ?? [];

verifier('aucun colis perdu', colisMigres.length, 2);
verifier('aucune réservation perdue', (migre.reservations ?? []).length, 1);
verifier('le compte est conservé', migre.voyageur?.nom, 'SAWADOGO');
verifier('un colis « déposé » d’office redevient à déposer', colisMigres[0]?.statut, 'A_DEPOSER');
verifier('sa fausse date de dépôt disparaît', colisMigres[0]?.deposeLe, undefined);
verifier(
  'et devient sa date de préparation',
  colisMigres[0]?.prepareLe,
  '2026-08-01T09:00:00.000Z',
);
// Un colis déjà arrivé a forcément été remis au guichet : on ne le fait pas reculer.
verifier('un colis déjà en route n’est pas rembobiné', colisMigres[1]?.statut, 'ARRIVE');
verifier('sa date de dépôt est conservée', colisMigres[1]?.deposeLe, '2026-07-01T09:00:00.000Z');

// Repasser la migration sur un contenu déjà converti ne doit rien changer.
const deuxiemePassage = migrerEtat(migre, 3);
verifier('migration déjà faite : rien ne bouge', (deuxiemePassage.colis ?? [])[0]?.statut, 'A_DEPOSER');

/* ── Le verrou : deux appuis ne font jamais deux réservations ─────────────── */

groupe('Verrou — la même action ne part jamais deux fois');

await (async () => {
  // Une opération volontairement lente : c'est exactement la fenêtre pendant
  // laquelle un voyageur impatient tape une seconde fois.
  let executions = 0;
  const lente = () =>
    new Promise<void>((resoudre) => {
      executions += 1;
      setTimeout(resoudre, 20);
    });

  const verrou = creerVerrou();
  const [premier, second] = await Promise.all([verrou.executer(lente), verrou.executer(lente)]);

  verifier('deux appuis simultanés, une seule exécution', executions, 1);
  verifier('le premier appui est lancé', premier, true);
  verifier('le second est ignoré, pas mis en attente', second, false);
  verifier('le verrou est rendu après coup', verrou.occupe, false);

  // Une fois terminée, l'action redevient disponible : le verrou protège du
  // double appui, il ne condamne pas le bouton.
  const troisieme = await verrou.executer(lente);
  verifier('un appui ultérieur repasse', troisieme, true);
  verifier('et exécute réellement', executions, 2);
})();

await (async () => {
  /*
   * Le cas qui compte le plus : une opération qui échoue doit **rendre** le
   * verrou. Sans le `finally`, un seul réseau coupé condamnerait le bouton
   * « Réserver » pour toute la session, et le voyageur ne pourrait plus rien faire.
   */
  const verrou = creerVerrou();
  let leve: string | null = null;
  try {
    await verrou.executer(async () => {
      throw new Error('réseau coupé');
    });
  } catch (e) {
    leve = e instanceof Error ? e.message : String(e);
  }

  verifier("l'erreur est propagée à l'appelant", leve, 'réseau coupé');
  verifier('et le verrou est libéré malgré l’échec', verrou.occupe, false);

  let reprise = false;
  await verrou.executer(async () => {
    reprise = true;
  });
  verifier('un nouvel essai est possible après un échec', reprise, true);
})();

console.log(`\n${reussis} réussis, ${echoues} échoués\n`);
process.exit(echoues > 0 ? 1 : 0);

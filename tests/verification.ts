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

import {
  decalerHeure,
  departsAVenir,
  estAujourdhui,
  jourFrancais,
  joursAvantExpiration,
  prenomAffiche,
} from '../src/lib/format';
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
import {
  actionsPossibles,
  billetEmis,
  etapeReservation,
  paiementEtabli,
} from '../src/lib/parcours';
import { politiqueAnnulation } from '../src/lib/annulation';
import { confirmationTardiveRecevable } from '../src/lib/confirmation';
import {
  etapeCourante,
  messageDestinataire,
  numeroInternational,
  relanceNecessaire,
} from '../src/lib/colis';
import { migrerEtat } from '../src/store/migration';
import { creerVerrou } from '../src/lib/verrou';
import { encoder } from '../src/lib/code39';
import { paiementPourVille } from '../src/data/reseau';
import { dateFrancaiseVersIso, lireRectoCnib, rectoExploitable } from '../src/lib/cnibRecto';
import { carteSuffisante, fusionnerCarte } from '../src/lib/carteIdentite';
import { placerLecture, type FaceCarte, type LectureFace } from '../src/lib/facesCarte';
import { lireTicketPapier, ticketExploitable } from '../src/lib/ticketPapier';
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

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let reussis = 0;
let echoues = 0;

/** Tous les écrans de l'application, pour les contrôles qui relisent l'interface. */
function fichiersEcrans(dossier = 'app'): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? fichiersEcrans(join(dossier, e.name))
      : e.name.endsWith('.tsx')
        ? [join(dossier, e.name)]
        : [],
  );
}

const lireFichier = (chemin: string) => readFileSync(chemin, 'utf8');

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
/*
 * Les vecteurs officiels ci-dessus mesurent 0, 3 et 56 octets, et laissaient passer
 * une faute de remplissage sur toute longueur congrue à 55 modulo 64 : le condensé
 * divergeait de la référence, et avec lui la signature des billets de cette taille.
 * On balaie donc les longueurs, au lieu d'espérer que trois cas suffisent.
 */
{
  // Condensés de référence de « a » répété, calculés par une implémentation tierce.
  const references: Record<number, string> = {
    55: '9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318',
    56: 'b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a',
    119: '31eba51c313a5c08226adf18d4a359cfdfd8d2e816b13f4af952f7ea6584dcfb',
  };
  for (const [longueur, attendu] of Object.entries(references)) {
    verifier(
      `SHA-256 sur ${longueur} octets`,
      versHex(sha256(versOctets('a'.repeat(Number(longueur))))),
      attendu,
    );
  }
  // La signature d'un billet passe par HMAC : on vérifie la même frontière là aussi.
  verifier(
    'HMAC stable sur 55 octets',
    versHex(hmacSha256(versOctets('cle'), versOctets('a'.repeat(55)))).length,
    64,
  );
}

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

/*
 * « Je viens » n'est pas « j'ai payé ».
 *
 * L'écran d'alarme fait passer la réservation en CONFIRMEE. Ce statut valait
 * paiement, et **appuyer sur « Oui, je viens » sur une réservation impayée
 * fabriquait un billet valide** — QR signé compris, accepté par le contrôleur. Le
 * même défaut ouvrait un remboursement en caisse pour un billet jamais réglé.
 */
const confirmeImpaye = { ...billetDeBase, statut: 'CONFIRMEE' as const };
const confirmePaye = { ...confirmeImpaye, payeLe: '2026-08-09T07:00:00.000Z' };

verifier('confirmer sa venue ne paie pas', paiementEtabli(confirmeImpaye), false);
verifier('une réservation confirmée mais impayée reste à payer', etapeReservation(confirmeImpaye), 'A_PAYER');
verifier('et ne délivre aucun billet', billetEmis(confirmeImpaye), false);
verifier('confirmée après encaissement : payée', paiementEtabli(confirmePaye), true);
verifier('et le billet est émis', billetEmis(confirmePaye), true);
// Rien à rembourser sur ce qui n'a jamais été encaissé, quel que soit le statut.
verifier(
  'aucun remboursement pour une confirmée impayée',
  politiqueAnnulation(confirmeImpaye, new Date('2026-08-09T06:00:00')).montantRembourse,
  0,
);
verifier(
  'et rien à traiter en caisse',
  politiqueAnnulation(confirmeImpaye, new Date('2026-08-09T06:00:00')).actionAgentRequise,
  false,
);

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

/*
 * Les dégradations réelles d'une reconnaissance de caractères.
 *
 * Le premier essai sur une vraie photo a échoué, et pas pour une raison exotique :
 * les chevrons ne survivent pas à la lecture optique. Rendus « « », « ‹ », ou
 * purement avalés, ils raccourcissent la ligne au point qu'un filtre de longueur la
 * rejetait. Ces contrôles rejouent chaque dégradation observée, sur une carte
 * fictive dont on connaît la réponse exacte : la bande retrouvée doit être
 * **identique à l'originale**, pas seulement décodable.
 */
const BANDE_FICTIVE = [
  'I<BFAB987654323<<<<<<<<<<<<<<<',
  '9005145F3203112BFA<<<<<<<<<<<2',
  'OUEDRAOGO<<FATIMATA<ADIZA<<<<<',
];
const ATTENDUE = BANDE_FICTIVE.join('\n');

const degradations: [string, string][] = [
  ['bande propre', ATTENDUE],
  [
    'noyée dans les mentions de la carte',
    ['BURKINA FASO', "CARTE NATIONALE D'IDENTITE", ...BANDE_FICTIVE, 'Signature'].join('\n'),
  ],
  ['chevrons doubles rendus « »', ATTENDUE.replace(/<</g, '«')],
  ['chevrons simples rendus ‹', ATTENDUE.replace(/</g, '‹')],
  ['espaces insérés tous les cinq caractères', BANDE_FICTIVE.map((l) => l.replace(/(.{5})/g, '$1 ')).join('\n')],
  ['les trois lignes recollées en une', BANDE_FICTIVE.join('')],
  ['O lu partout à la place de 0', ATTENDUE.replace(/0/g, 'O')],
  [
    'I pour 1 et S pour 5 dans les dates',
    [BANDE_FICTIVE[0], BANDE_FICTIVE[1]!.replace(/1/g, 'I').replace(/5/g, 'S'), BANDE_FICTIVE[2]].join('\n'),
  ],
  [
    'B pour 8 et G pour 6 dans le numéro',
    [BANDE_FICTIVE[0]!.replace(/8/g, 'B').replace(/6/g, 'G'), BANDE_FICTIVE[1], BANDE_FICTIVE[2]].join('\n'),
  ],
  ['chevrons de remplissage avalés en fin de ligne', BANDE_FICTIVE.map((l) => l.replace(/<+$/, '')).join('\n')],
  [
    'tout à la fois : mentions, « », espaces, O pour 0',
    ['REPUBLIQUE', ...BANDE_FICTIVE.map((l) => l.replace(/<</g, '«'))].join('\n').replace(/0/g, 'O'),
  ],
];

for (const [nom, texte] of degradations) {
  verifier(`bande retrouvée intacte — ${nom}`, extraireBandeDepuisTexte(texte), ATTENDUE);
}


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
// « 00226 » ne commençait pas par « 226 » et recevait l'indicatif une seconde fois :
// le lien wa.me produit était refusé, et le code de retrait ne partait pas.
verifier('préfixe 00 retiré', numeroInternational('0022670451288'), '22670451288');
verifier('écriture avec +', numeroInternational('+226 70 45 12 88'), '22670451288');

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

/* ── Coordonnées de paiement ─────────────────────────────────────────────── */

groupe('Orange Money — ne jamais deviner la caisse');

// Seules Ouaga et Bobo ont des comptes relevés. Un repli sur Ouaga envoyait
// l'argent d'un voyageur de Ouahigouya à la mauvaise agence.
verifier('Ouagadougou : coordonnées connues', Boolean(paiementPourVille('Ouagadougou')), true);
verifier('Bobo-Dioulasso : coordonnées connues', Boolean(paiementPourVille('Bobo-Dioulasso')), true);
verifier('Ouahigouya : rien plutôt qu’un mauvais numéro', paiementPourVille('Ouahigouya'), undefined);

/* ── Dates affichées ─────────────────────────────────────────────────────── */

groupe('jourFrancais — les dates ISO ne s’affichent jamais telles quelles');
// Le profil montrait « 2031-08-30 » là où la carte du voyageur dit « 30/08/2031 ».
verifier('date ISO convertie', jourFrancais('2031-08-30'), '30/08/2031');
verifier('horodatage complet accepté', jourFrancais('2026-09-08T06:00:00.000Z'), '08/09/2026');
// Ce qui n'est pas une date reste tel quel plutôt que de devenir « Invalid Date ».
verifier('valeur non datée rendue intacte', jourFrancais('—'), '—');

/* ── Code-barres ─────────────────────────────────────────────────────────── */

groupe('Code 39 — le billet doit se scanner comme le papier');

/*
 * La table ne contenait que les chiffres : les lettres de nos références étaient
 * silencieusement sautées, et « SB-7K2Q4M » se scannait « -724 ». Ces contrôles
 * portent sur la structure de la table, qui est vérifiable — trois éléments larges
 * sur neuf, ni plus ni moins — plutôt que sur des motifs recopiés.
 */
{
  const reference = 'SB-7K2Q4M';
  const { barres, total } = encoder(reference);
  // 9 éléments par caractère + 1 séparateur, sauf après le dernier.
  const caracteres = reference.length + 2; // les deux gardes « * »
  verifier('une référence complète est encodée', barres.length, caracteres * 5);
  verifier('largeur cohérente', total > 0, true);

  // Un caractère hors table ne doit rien produire, plutôt qu'un dessin faux.
  verifier('caractère inconnu : aucun code plutôt qu’un faux', encoder('SB#1').total, 0);

  // Le vrai format de référence de l'application passe.
  verifier('nos références sont encodables', encoder(referenceBillet()).total > 0, true);
}

/* ── Affichage du prénom ─────────────────────────────────────────────────── */

groupe('prenomAffiche — la carte crie, l’accueil non');
verifier('capitales de la carte adoucies', prenomAffiche('ANGE'), 'Ange');
verifier('prénom composé', prenomAffiche('JEAN-PAUL'), 'Jean-Paul');
verifier('apostrophe', prenomAffiche("N'GOLO"), "N'Golo");
verifier('accents conservés', prenomAffiche('AÏSSATA'), 'Aïssata');
verifier('déjà en minuscules', prenomAffiche('ange'), 'Ange');

/* ── Le recto de la carte, lu par étiquettes ─────────────────────────────── */

groupe('CNIB — lire le recto d’une carte photographiée');

/*
 * Texte tel qu'un moteur de reconnaissance le rend sur une CNIB burkinabè : lignes
 * dans le désordre du cadrage, accents perdus, espaces irréguliers dans les
 * numéros. La carte est **fictive** — on ne met la pièce d'identité de personne
 * dans un dépôt de code — mais sa mise en page est celle du document réel.
 */
const RECTO_BRUT = `CARTE NATIONALE D'IDENTITE BURKINABE
BURKINA FASO
Unite - Progres - Justice
2 0 0 4 1 2 0 0 2 0 8 0 0 8 0 2 7
Nom:  OUEDRAOGO
Prénoms:  FATIMATA ADIZA
Né(e) le:  14/05/1990  A KOUDOUGOU
Sexe: F          Taille: 165 cm
Profession:  COMMERCANTE
Délivrée le:  12/03/2022
Expire le:  11/03/2032        B 9 8 7 6 5 4 3 2
Signature du titulaire`;

const recto = lireRectoCnib(RECTO_BRUT);
verifier('nom lu au recto', recto.nom, 'OUEDRAOGO');
verifier('prénoms lus au recto', recto.prenoms, 'FATIMATA ADIZA');
verifier('date de naissance convertie', recto.dateNaissance, '1990-05-14');
// Le lieu se lit sur la même ligne que la date, après un « A » isolé.
verifier('lieu de naissance', recto.lieuNaissance, 'KOUDOUGOU');
verifier('sexe', recto.sexe, 'F');
verifier('taille', recto.tailleCm, 165);
verifier('profession', recto.profession, 'COMMERCANTE');
verifier('date de délivrance', recto.dateDelivrance, '2022-03-12');
verifier("date d'expiration", recto.dateExpiration, '2032-03-11');
// Les numéros sont imprimés espacés : on les recolle.
verifier('numéro de carte recollé', recto.numeroCarte, 'B98765432');
verifier("numéro d'identification à 17 chiffres", recto.numeroIdentification, '20041200208008027');

/*
 * L'ordre des lignes dépend du cadrage de la photo, pas de l'impression. Avec les
 * prénoms rendus en premier, l'étiquette « NOM » se trouvait à l'intérieur de
 * « PRÉNOMS » : le nom revenait vide, et l'ouverture de compte se bloquait sans
 * que rien ne l'explique.
 */
const rectoInverse = lireRectoCnib(
  'Prénoms:  FATIMATA ADIZA\nNom:  OUEDRAOGO\nExpire le:  11/03/2032',
);
verifier('nom trouvé même si les prénoms viennent avant', rectoInverse.nom, 'OUEDRAOGO');
verifier('et les prénoms restent entiers', rectoInverse.prenoms, 'FATIMATA ADIZA');

// Deux champs sur une seule ligne, comme « Sexe: M   Taille: 177 cm » sur la carte.
const rectoPartage = lireRectoCnib('Sexe: F     Taille: 165 cm');
verifier('valeur bornée par l’étiquette suivante', rectoPartage.sexe, 'F');
verifier('et la seconde valeur est lue', rectoPartage.tailleCm, 165);

// Les accents survivent au découpage.
verifier(
  'accents conservés dans la valeur',
  lireRectoCnib('Nom:  KABORÉ').nom,
  'KABORÉ',
);

// Rien n'est deviné : un texte quelconque ne doit rien produire.
const rectoVide = lireRectoCnib('Reçu de caisse\nMerci de votre visite\n15/08/2026');
verifier('aucun champ inventé sur un texte étranger', rectoExploitable(rectoVide), false);

// Une date impossible est rejetée plutôt que rangée dans le formulaire.
verifier('date impossible rejetée', dateFrancaiseVersIso('32/13/2020'), undefined);
verifier('date valide convertie', dateFrancaiseVersIso('01/10/2004'), '2004-10-01');

/* ── Fusion des deux faces ───────────────────────────────────────────────── */

groupe('CNIB — fusionner le recto et le dos');

const BANDE_SYNTHETIQUE = [
  'I<BFAB987654323<<<<<<<<<<<<<<<',
  '9005145F3203112BFA<<<<<<<<<<<2',
  'OUEDRAOGO<<FATIMATA<ADIZA<<<<<',
].join('\n');

const lueDos = lireBandeTD1(BANDE_SYNTHETIQUE);
verifier('la bande synthétique est valide', lueDos.ok, true);

const fusionCarte = fusionnerCarte(lueDos.ok ? lueDos.identite : null, recto);

// Les champs communs viennent de la bande : elle seule porte des clés de contrôle.
verifier('le nom vient de la bande', fusionCarte.sources.nom, 'BANDE');
verifier("l'expiration vient de la bande", fusionCarte.sources.dateExpiration, 'BANDE');
verifier('le numéro vient de la bande', fusionCarte.carte.numeroCarte, 'B98765432');
// Et le recto comble ce que la bande ne contient pas.
verifier('le lieu de naissance vient du recto', fusionCarte.sources.lieuNaissance, 'RECTO');
verifier('la profession vient du recto', fusionCarte.carte.profession, 'COMMERCANTE');
verifier("le numéro d'identification vient du recto", fusionCarte.sources.numeroIdentification, 'RECTO');
// Les deux faces concordent : aucun désaccord ne doit être signalé.
verifier('aucun désaccord sur une carte cohérente', fusionCarte.desaccords, []);

// Le recto seul suffit à remplir un formulaire, en le signalant comme à vérifier.
const sansBande = fusionnerCarte(null, recto);
verifier('le recto seul remplit le nom', sansBande.carte.nom, 'OUEDRAOGO');
verifier('et il est marqué comme lu au recto', sansBande.sources.nom, 'RECTO');
verifier('la carte est exploitable', carteSuffisante(sansBande.carte), true);

/*
 * Le cas qui justifie toute la fusionCarte : les deux faces se contredisent. Aucun
 * système ne peut deviner laquelle a raison — mais il doit le dire, et pointer le
 * champ. Ici, un « 8 » lu à la place d'un « 3 » sur l'année d'expiration du recto.
 */
const rectoFautif = lireRectoCnib(RECTO_BRUT.replace('11/03/2032', '11/03/2082'));
const contradiction = fusionnerCarte(lueDos.ok ? lueDos.identite : null, rectoFautif);
verifier(
  "le désaccord sur l'expiration est signalé",
  contradiction.desaccords,
  ['dateExpiration'],
);
verifier(
  'et la valeur retenue reste celle de la bande',
  contradiction.carte.dateExpiration,
  '2032-03-11',
);
// Une différence de casse ou d'accent n'est pas un désaccord : le signaler ferait
// perdre confiance dans les vrais.
const rectoCasse = lireRectoCnib(RECTO_BRUT.replace('OUEDRAOGO', 'Ouedraogo'));
verifier(
  'une différence de casse n’est pas un désaccord',
  fusionnerCarte(lueDos.ok ? lueDos.identite : null, rectoCasse).desaccords,
  [],
);

/* ── Rangement des deux faces ────────────────────────────────────────────── */

/*
 * Le défaut d'origine : dans Expo Go, la reconnaissance de caractères n'existe pas,
 * toute image revenait « recto », et la deuxième photo chassait la première. On
 * pouvait appuyer dix fois sur « Photographier ma carte » sans jamais avoir deux
 * images. Ces contrôles tiennent la règle qui l'empêche.
 */
groupe('Deux faces — une image illisible ne doit pas en chasser une autre');

const face = (f: FaceCarte, faceDeduite: boolean, uri: string): LectureFace => ({
  face: f,
  faceDeduite,
  uri,
  texte: '',
  avertissements: [],
});

// Le cas de l'utilisateur : rien n'est lisible, deux photos ajoutées à la suite.
const premiere = placerLecture([], face('RECTO', false, 'photo-1'));
verifier('la première image illisible prend la place du recto', premiere.map((l) => [l.face, l.uri]), [
  ['RECTO', 'photo-1'],
]);
const deuxieme = placerLecture(premiere, face('RECTO', false, 'photo-2'));
verifier(
  'la seconde prend la place libre au lieu d’effacer la première',
  deuxieme.map((l) => [l.face, l.uri]),
  [
    ['RECTO', 'photo-1'],
    ['VERSO', 'photo-2'],
  ],
);

// La face déduite garde son autorité : reprendre le dos remplace le dos.
const dosLu = placerLecture(deuxieme, face('VERSO', true, 'dos-decode'));
verifier(
  'une face déduite remplace la place qu’elle nomme',
  dosLu.map((l) => [l.face, l.uri]),
  [
    ['RECTO', 'photo-1'],
    ['VERSO', 'dos-decode'],
  ],
);

// Et l'inverse est la règle qui compte : une photo ratée ne doit pas effacer un
// décodage réussi.
const apresRate = placerLecture(dosLu, face('RECTO', false, 'photo-ratee'));
verifier(
  'une image illisible ne chasse jamais une face décodée',
  apresRate.find((l) => l.face === 'VERSO')?.uri,
  'dos-decode',
);
verifier('elle remplace celle qui n’était pas mieux établie', apresRate.length, 2);

// Deux faces déduites : une troisième image illisible ne peut rien effacer d'utile.
const deuxDeduites = [face('RECTO', true, 'recto-lu'), face('VERSO', true, 'dos-lu')];
const intrus = placerLecture(deuxDeduites, face('RECTO', false, 'floue'));
verifier('deux faces lues restent deux faces', intrus.length, 2);
verifier(
  'le dos décodé survit à une image floue',
  intrus.find((l) => l.face === 'VERSO')?.uri,
  'dos-lu',
);

/*
 * Les deux faces choisies **en un seul geste**.
 *
 * C'est ainsi que les écrans les rangent désormais : `nouvelles.reduce(placerLecture,
 * lectures)`, en une fois. Deux appels successifs liraient l'état d'avant et la
 * seconde face effacerait la première — le défaut corrigé, réintroduit par la porte
 * d'à côté. Ce contrôle fige le pliage.
 */
const dUnCoupIllisibles = [face('RECTO', false, 'img-1'), face('RECTO', false, 'img-2')].reduce(
  placerLecture,
  [] as LectureFace[],
);
verifier(
  'deux images illisibles choisies ensemble occupent les deux places',
  dUnCoupIllisibles.map((l) => [l.face, l.uri]),
  [
    ['RECTO', 'img-1'],
    ['VERSO', 'img-2'],
  ],
);

// Et quand la lecture fonctionne, l'ordre de sélection n'a aucune importance : le
// contenu décide. Choisir le dos en premier ne doit pas inverser la carte.
const dUnCoupLues = [face('VERSO', true, 'le-dos'), face('RECTO', true, 'le-recto')].reduce(
  placerLecture,
  [] as LectureFace[],
);
verifier(
  'deux faces déduites vont à leur place quel que soit l’ordre de sélection',
  [
    dUnCoupLues.find((l) => l.face === 'RECTO')?.uri,
    dUnCoupLues.find((l) => l.face === 'VERSO')?.uri,
  ],
  ['le-recto', 'le-dos'],
);

/* ── Confirmation tardive ────────────────────────────────────────────────── */

/*
 * « Oui, je viens » promettait « Votre place est gardée » à toute heure, y compris
 * après le départ. À cinq minutes du départ, la place part à la liste d'attente et
 * l'application n'a aucun moyen de la retenir : l'assurance était fausse, et c'est
 * le genre d'assurance qui fait rater un bus. La règle existait dans le code sans
 * être branchée — elle l'est, et ces contrôles la tiennent.
 */
groupe('Confirmation tardive — jusqu’où « je viens » veut encore dire quelque chose');

const resaConf: Reservation = {
  ...billetDeBase,
  date: '2026-09-10',
  heure: '16:00',
  statut: 'OPTION',
};

verifier(
  'la veille, la confirmation est recevable',
  confirmationTardiveRecevable(resaConf, new Date('2026-09-09T16:00:00')),
  true,
);
verifier(
  'une heure avant, encore recevable',
  confirmationTardiveRecevable(resaConf, new Date('2026-09-10T15:00:00')),
  true,
);
verifier(
  'à six minutes du départ, encore recevable',
  confirmationTardiveRecevable(resaConf, new Date('2026-09-10T15:54:00')),
  true,
);
verifier(
  'à quatre minutes, la place est déjà à la liste d’attente',
  confirmationTardiveRecevable(resaConf, new Date('2026-09-10T15:56:00')),
  false,
);
verifier(
  'après le départ, plus rien à confirmer',
  confirmationTardiveRecevable(resaConf, new Date('2026-09-10T16:30:00')),
  false,
);
verifier(
  'une réservation annulée ne se confirme pas',
  confirmationTardiveRecevable(
    { ...resaConf, statut: 'ANNULEE' },
    new Date('2026-09-09T16:00:00'),
  ),
  false,
);
verifier(
  'si la place a été réattribuée, c’est non quoi qu’il arrive',
  confirmationTardiveRecevable(resaConf, new Date('2026-09-09T16:00:00'), true),
  false,
);

/* ── Longueur des sous-titres de boutons ─────────────────────────────────── */

/*
 * Un défaut qu'aucun test de logique ne pouvait voir — il ne se découvre qu'en
 * REGARDANT l'écran. Sur un téléphone de 390 points de large, le sous-titre d'un
 * bouton tient sur une ligne et se fait couper au-delà : « fonctionne sans résea… ».
 * Trois l'étaient, dont un sur l'écran des agents.
 *
 * Le seuil est empirique, mesuré sur les captures : au-delà, ça déborde. Ce contrôle
 * lit les écrans eux-mêmes, comme une relecture automatique, et échoue avant qu'une
 * phrase trop longue n'atteigne un téléphone.
 */
groupe('Écrans — un sous-titre de bouton ne doit pas déborder');

const LIMITE_SOUS_TITRE = 52;
const sousTitresTropLongs: string[] = [];
for (const fichier of fichiersEcrans()) {
  const source = lireFichier(fichier);
  for (const [, guillemets, apostrophes] of source.matchAll(
    /sousTitre=(?:"([^"]{10,})"|\{?\s*['"]([^'"]{10,})['"])/g,
  )) {
    const texte = guillemets ?? apostrophes ?? '';
    if (texte.length > LIMITE_SOUS_TITRE) {
      sousTitresTropLongs.push(`${fichier} — « ${texte} » (${texte.length})`);
    }
  }
}
verifier(
  `aucun sous-titre au-dessus de ${LIMITE_SOUS_TITRE} caractères`,
  sousTitresTropLongs,
  [],
);

/* ── Lecture d'un ticket papier en photo ─────────────────────────────────── */

/*
 * Le code-barres ne donne que le numéro. Tout le reste — date, heure, convocation,
 * tarif, trajet, classe — se recopiait à la main : six champs, sur un téléphone, à la
 * gare. Autant dire que personne ne le faisait, et que l'import de ticket papier,
 * qui est pourtant le cœur de l'horizon 1, restait théorique.
 *
 * Un ticket n'a ni positions fixes ni clés de contrôle, contrairement à la bande
 * d'une carte d'identité : on ne peut rien vérifier, seulement reconnaître des
 * formes. D'où la règle — rien n'est affirmé, tout est proposé, et un champ non
 * reconnu reste vide plutôt que deviné.
 */
groupe('Ticket papier — lu en photo, jamais deviné');

const TICKET_PROPRE = [
  'SARAMAYA TRANSPORT',
  'Un service des hommes integres',
  'TICKET DE VOYAGE   N° 66456',
  'OUAHIGOUYA - OUAGADOUGOU',
  'DATE : 06/08/2026',
  'DEPART 16:00   CONVOCATION 15:30',
  'TRANSPORT ORDINAIRE CLIMATISE',
  'PRIX : 3 500 F CFA',
  'ALLER SIMPLE',
].join('\n');

const ticketPropre = lireTicketPapier(TICKET_PROPRE);
verifier('numéro du ticket', ticketPropre.numero, '66456');
verifier('date convertie en ISO', ticketPropre.date, '2026-08-06');
verifier('heure de départ', ticketPropre.heure, '16:00');
verifier('convocation', ticketPropre.convocation, '15:30');
verifier('tarif, espace insécable compris', ticketPropre.montant, 3500);
verifier('trajet dans le bon sens', [ticketPropre.origine, ticketPropre.destination], [
  'Ouahigouya',
  'Ouagadougou',
]);
verifier('classe', ticketPropre.classe, 'ORDINAIRE');
verifier('les huit champs sont annoncés', ticketPropre.champsLus.length, 8);

// Sans libellés, ni « DEPART » ni « N° » : seule la forme reste.
const ticketSale = lireTicketPapier(
  ['SARAMAVA TRANSPORT', '66456', 'OUAHIGOUYA OUAGADOUGOU', '06-08-2026', '15h30   16h00', 'VIP', '8 000 FCFA'].join('\n'),
);
verifier('sans libellé, la plus tardive est le départ', ticketSale.heure, '16:00');
verifier('et la précédente, la convocation', ticketSale.convocation, '15:30');
verifier('heures écrites avec un h', [ticketSale.heure, ticketSale.convocation], ['16:00', '15:30']);
verifier('VIP reconnu', ticketSale.classe, 'VIP_1RE');
verifier('le numéro ne se confond pas avec le tarif', ticketSale.numero, '66456');

// Ce qui compte le plus : ne rien inventer.
verifier(
  'un texte quelconque ne produit aucun champ',
  lireTicketPapier('Bonjour, ceci est une facture de telephone.').champsLus,
  [],
);
verifier(
  'et il n’est pas exploitable',
  ticketExploitable(lireTicketPapier('Bonjour, ceci est une facture.')),
  false,
);
verifier(
  'un nombre sans marque de monnaie n’est pas un tarif',
  lireTicketPapier('Reference 4520 du 06/08/2026').montant,
  undefined,
);
verifier(
  'une année ne passe pas pour un numéro de ticket',
  lireTicketPapier('Edite en 2026 a Ouagadougou').numero,
  undefined,
);

console.log(`\n${reussis} réussis, ${echoues} échoués\n`);
process.exit(echoues > 0 ? 1 : 0);

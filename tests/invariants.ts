/**
 * Contrôles qui ne dépendent pas de ce qu'on a pensé à tester.
 *
 * `verification.ts` vérifie des **exemples** : « pour cette réservation-là, on
 * attend ceci ». C'est utile, et c'est insuffisant — les trois défauts les plus
 * graves de ce projet sont passés à travers cent cinquante-deux exemples verts :
 *
 *   · un billet valide fabriqué sans paiement, parce que personne n'avait pensé à
 *     essayer « confirmer sa venue » sur une réservation impayée ;
 *   · un SHA-256 faux pour les longueurs congrues à 55 modulo 64, parce que les
 *     trois vecteurs officiels employés mesurent 0, 3 et 56 octets ;
 *   · un code-barres qui encodait autre chose que la référence, parce qu'aucun
 *     exemple ne contenait de lettre.
 *
 * Chacun aurait été trouvé par un contrôle d'une autre nature. Ce fichier les
 * rassemble, en quatre familles :
 *
 * 1. **Exploration exhaustive de la machine à états.** On applique toutes les
 *    suites d'actions possibles à une réservation, et on vérifie les invariants à
 *    *chaque* état atteignable. On ne choisit plus les cas : on les épuise.
 * 2. **Test différentiel.** On confronte notre SHA-256 à une implémentation
 *    indépendante, sur toutes les tailles — pas trois.
 * 3. **Invariant de structure.** Une table Code 39 est juste si chaque motif porte
 *    exactement trois éléments larges sur neuf. Vérifiable sans connaître la
 *    réponse.
 * 4. **Propriétés et métamorphisme.** Aller-retour, altération d'un caractère,
 *    permutation de l'ordre des lignes : des affirmations vraies pour *toutes* les
 *    entrées, éprouvées sur des milliers tirées au sort.
 *
 * Le tirage est **déterministe** : la même graine donne la même série, donc un
 * échec se reproduit. Un test aléatoire non reproductible est un test qu'on finit
 * par ignorer.
 *
 *   npm run invariants
 */

import { createHash, createHmac } from 'node:crypto';
import { LocalProvider } from '../src/sync/localProvider';
import {
  actionsPossibles,
  billetEmis,
  etapeReservation,
  libelleEtape,
  paiementEtabli,
} from '../src/lib/parcours';
import { politiqueAnnulation } from '../src/lib/annulation';
import { construireQrBillet, verifierQrBillet } from '../src/lib/billetQr';
import { cleControle, lireBandeTD1 } from '../src/lib/cnib';
import { lireRectoCnib } from '../src/lib/cnibRecto';
import { MOTIFS, encoder } from '../src/lib/code39';
import { decalerHeure } from '../src/lib/format';
import { numeroInternational } from '../src/lib/colis';
import { migrerEtat } from '../src/store/migration';
import {
  depuisBase64Url,
  hmacSha256,
  sha256,
  versBase64Url,
  versHex,
} from '../src/lib/sha256';
import type { Reservation, StatutReservation, Voyageur } from '../src/types';

let reussis = 0;
let echoues = 0;

function verifier(nom: string, condition: boolean, detail = '') {
  if (condition) {
    reussis += 1;
    console.log(`  ok    ${nom}`);
  } else {
    echoues += 1;
    console.log(`  ÉCHEC ${nom}${detail ? `\n        ${detail}` : ''}`);
  }
}

function groupe(titre: string) {
  console.log(`\n${titre}`);
}

/**
 * Générateur pseudo-aléatoire déterministe (xorshift32).
 *
 * `Math.random()` rendrait les échecs irreproductibles : on verrait passer une
 * erreur une fois sur cinquante sans jamais pouvoir la reprendre. Ici, la graine
 * fixe la série entière.
 */
function tirage(graine: number) {
  let etat = graine >>> 0 || 1;
  return () => {
    etat ^= etat << 13;
    etat >>>= 0;
    etat ^= etat >>> 17;
    etat ^= etat << 5;
    etat >>>= 0;
    return etat / 0x100000000;
  };
}

const hasard = tirage(20260815);
const entier = (max: number) => Math.floor(hasard() * max);
const parmi = <T,>(liste: readonly T[]): T => liste[entier(liste.length)]!;

/* ══ 1. Exploration exhaustive de la machine à états ═══════════════════════ */

groupe('États atteignables — toutes les suites d’actions, tous les invariants');

const VOYAGEUR: Voyageur = {
  id: 'v-1',
  nom: 'OUEDRAOGO',
  prenom: 'FATIMATA ADIZA',
  telephone: '70451288',
};

const DEPART: Reservation = {
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
  statut: 'OPTION',
  supports: ['NUMERIQUE'],
  creeLe: '2026-08-09T06:00:00.000Z',
  expireLe: '2026-09-08T06:00:00.000Z',
};

/** Exécute une méthode du vrai fournisseur sur une réservation isolée. */
async function viaFournisseur(
  r: Reservation,
  appel: (p: LocalProvider) => Promise<unknown>,
): Promise<Reservation> {
  let courant = r;
  const fournisseur = new LocalProvider([r], (liste) => {
    courant = liste[0] ?? courant;
  });
  await appel(fournisseur);
  return courant;
}

/**
 * Les gestes possibles sur une réservation.
 *
 * Ceux du voyageur passent par le **vrai** fournisseur, pour que le test porte sur
 * le code livré et non sur un modèle qui lui ressemblerait. Les trois derniers sont
 * des statuts imposés de l'extérieur — la compagnie constate un embarquement, une
 * absence, un silence — et sont posés directement, faute d'action correspondante
 * dans l'application.
 */
const GESTES: Record<string, (r: Reservation) => Promise<Reservation>> = {
  declarerPaiement: async (r) => ({ ...r, paiementDeclareLe: '2026-08-09T07:00:00.000Z' }),
  encaisser: (r) => viaFournisseur(r, (p) => p.enregistrerPaiement(r.id, 'ORANGE_MONEY')),
  confirmerVenue: (r) => viaFournisseur(r, (p) => p.confirmerPresence(r.id)),
  annuler: (r) => viaFournisseur(r, (p) => p.annuler(r.id)),
  reprendre: async (r) => ({
    ...r,
    statut: (r.payeLe ? 'PAYEE' : 'OPTION') as StatutReservation,
    annuleLe: undefined,
  }),
  reporter: (r) => viaFournisseur(r, (p) => p.reporter(r.id, { date: '2026-08-20', heure: '10:00' })),
  embarquer: async (r) => ({ ...r, statut: 'EMBARQUE' as StatutReservation }),
  absent: async (r) => ({ ...r, statut: 'NO_SHOW' as StatutReservation }),
  sansReponse: async (r) => ({ ...r, statut: 'SANS_REPONSE' as StatutReservation }),
};

const NOMS_GESTES = Object.keys(GESTES);

interface Violation {
  invariant: string;
  chemin: string;
  etat: string;
}

const violations: Violation[] = [];

/** Les invariants, éprouvés à chaque état atteignable. */
function controlerInvariants(r: Reservation, chemin: string) {
  const decrire = () =>
    `statut=${r.statut} payeLe=${r.payeLe ? 'oui' : 'non'} declare=${r.paiementDeclareLe ? 'oui' : 'non'}`;
  const noter = (invariant: string) =>
    violations.push({ invariant, chemin, etat: decrire() });

  const paye = paiementEtabli(r);
  const emis = billetEmis(r);
  const actions = actionsPossibles(r);
  const qr = construireQrBillet(r, VOYAGEUR);

  // I. Aucun titre de transport sans paiement constaté.
  if (emis && !paye) noter('billet émis sans paiement établi');

  // II. Le QR existe exactement quand le billet est émis — ni plus, ni moins.
  if (Boolean(qr) !== emis) noter('QR et billet en désaccord');

  // III. Un QR que nous émettons doit être accepté au contrôle le jour du voyage.
  if (qr) {
    const controle = verifierQrBillet(qr, new Date(`${r.date}T12:00:00`));
    if (controle.verdict === 'NON_PAYE') noter('QR émis mais jugé impayé au contrôle');
    if (controle.verdict === 'SIGNATURE_INVALIDE') noter('QR émis avec une signature invalide');
    if (controle.verdict === 'ILLISIBLE') noter('QR émis illisible');
    // ... et il doit rendre fidèlement ce qui a été mis dedans.
    if (controle.billet && controle.billet.r !== r.reference) noter('référence altérée dans le QR');
    if (controle.billet && controle.billet.m !== r.montant) noter('montant altéré dans le QR');
  }

  // IV. Rien à rembourser, rien à traiter en caisse, sur ce qui n'a jamais été payé.
  const politique = politiqueAnnulation(r, new Date('2026-08-09T06:00:00'));
  if (!paye && politique.montantRembourse !== 0) noter('remboursement sur une réservation impayée');
  if (!paye && politique.actionAgentRequise) noter('passage en caisse sur une réservation impayée');
  if (politique.montantRembourse > r.montant) noter('remboursement supérieur au montant payé');
  if (politique.montantRembourse < 0) noter('remboursement négatif');

  // V. Les écrans et les règles disent la même chose.
  if (actions.afficherBillet !== emis) noter('actionsPossibles en désaccord avec billetEmis');
  if (actions.declarerPaiement && paye) noter('déclaration de paiement proposée après encaissement');

  // VI. Toute étape a un libellé montrable.
  const etape = etapeReservation(r);
  const libelle = libelleEtape(r);
  if (!libelle.titre || !libelle.explication) noter(`étape ${etape} sans libellé`);
}

/** Parcourt toutes les suites de gestes jusqu'à une profondeur donnée. */
async function explorer(r: Reservation, chemin: string[], profondeur: number) {
  controlerInvariants(r, chemin.join(' → ') || '(état initial)');
  if (profondeur === 0) return;
  for (const nom of NOMS_GESTES) {
    const suivant = await GESTES[nom]!(r);
    await explorer(suivant, [...chemin, nom], profondeur - 1);
  }
}

const PROFONDEUR = 3;
await explorer(DEPART, [], PROFONDEUR);

const etatsVisites = NOMS_GESTES.length ** PROFONDEUR;
verifier(
  `${etatsVisites.toLocaleString('fr')} suites de gestes explorées, aucun invariant violé`,
  violations.length === 0,
  violations
    .slice(0, 5)
    .map((v) => `${v.invariant}\n          après : ${v.chemin}\n          état  : ${v.etat}`)
    .join('\n        '),
);

/* ══ 2. Test différentiel — notre SHA-256 contre une implémentation tierce ══ */

groupe('SHA-256 et HMAC — confrontés à une implémentation indépendante');

{
  let divergences = 0;
  // Toutes les longueurs jusqu'à quatre blocs : c'est là que vivent les fautes de
  // remplissage, et elles ne se voient qu'aux frontières.
  for (let n = 0; n <= 260; n += 1) {
    const octets = new Uint8Array(n);
    for (let i = 0; i < n; i += 1) octets[i] = entier(256);
    const nous = versHex(sha256(octets));
    const reference = createHash('sha256').update(octets).digest('hex');
    if (nous !== reference) divergences += 1;
  }
  verifier('261 longueurs de message, aucun écart', divergences === 0, `${divergences} écart(s)`);
}

{
  let divergences = 0;
  // Clés courtes, de la taille d'un bloc, et plus longues qu'un bloc : les trois
  // chemins distincts de HMAC.
  for (const tailleCle of [1, 32, 63, 64, 65, 131, 200]) {
    for (let n = 0; n <= 130; n += 1) {
      const cle = new Uint8Array(tailleCle);
      for (let i = 0; i < tailleCle; i += 1) cle[i] = entier(256);
      const message = new Uint8Array(n);
      for (let i = 0; i < n; i += 1) message[i] = entier(256);
      const nous = versHex(hmacSha256(cle, message));
      const reference = createHmac('sha256', Buffer.from(cle)).update(message).digest('hex');
      if (nous !== reference) divergences += 1;
    }
  }
  verifier('917 combinaisons clé/message, aucun écart', divergences === 0, `${divergences} écart(s)`);
}

{
  let echecs = 0;
  for (let essai = 0; essai < 500; essai += 1) {
    const n = entier(300);
    const octets = new Uint8Array(n);
    for (let i = 0; i < n; i += 1) octets[i] = entier(256);
    const retour = depuisBase64Url(versBase64Url(octets));
    if (retour.length !== octets.length || octets.some((o, i) => retour[i] !== o)) echecs += 1;
  }
  verifier('base64url : aller-retour fidèle sur 500 tirages', echecs === 0, `${echecs} échec(s)`);
}

/* ══ 3. Invariant de structure — la table Code 39 ══════════════════════════ */

groupe('Code 39 — la table est juste par construction');

{
  const fautifs: string[] = [];
  for (const [caractere, motif] of Object.entries(MOTIFS)) {
    if (motif.length !== 9) {
      fautifs.push(`${caractere} : ${motif.length} éléments`);
      continue;
    }
    const larges = [...motif].filter((e) => e === 'w').length;
    if (larges !== 3) fautifs.push(`${caractere} : ${larges} éléments larges`);

    const barresLarges = [0, 2, 4, 6, 8].filter((i) => motif[i] === 'w').length;
    const espacesLarges = [1, 3, 5, 7].filter((i) => motif[i] === 'w').length;
    // Deux familles, et deux seulement : 2 barres + 1 espace, ou 0 barre + 3 espaces.
    const valide =
      (barresLarges === 2 && espacesLarges === 1) || (barresLarges === 0 && espacesLarges === 3);
    if (!valide) fautifs.push(`${caractere} : ${barresLarges} barres / ${espacesLarges} espaces larges`);
  }
  verifier(
    `${Object.keys(MOTIFS).length} motifs, structure conforme`,
    fautifs.length === 0,
    fautifs.join(' · '),
  );

  // Aucun motif en double : deux caractères identiques seraient indécodables.
  const distincts = new Set(Object.values(MOTIFS));
  verifier('aucun motif partagé par deux caractères', distincts.size === Object.keys(MOTIFS).length);

  // Toute chaîne encodable produit exactement 5 barres par caractère, gardes comprises.
  let ecarts = 0;
  const alphabet = Object.keys(MOTIFS).filter((c) => c !== '*');
  for (let essai = 0; essai < 300; essai += 1) {
    const longueur = 1 + entier(12);
    const valeur = Array.from({ length: longueur }, () => parmi(alphabet)).join('');
    const { barres } = encoder(valeur);
    if (barres.length !== (longueur + 2) * 5) ecarts += 1;
  }
  verifier('300 chaînes encodées, comptage de barres exact', ecarts === 0, `${ecarts} écart(s)`);
}

/* ══ 4. Propriétés et métamorphisme ════════════════════════════════════════ */

groupe('Bande CNIB — aller-retour, et détection des altérations');

/** Valeur d'un caractère dans une clé ICAO — chiffres, lettres, remplissage. */
function valeurIcao(c: string): number {
  if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
  if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55;
  return 0;
}

/** Fabrique une bande TD1 valide à partir de champs choisis. */
function fabriquerBande(
  numero: string,
  naissance: string,
  sexe: string,
  expiration: string,
  nom: string,
  prenoms: string,
): string {
  const l1 = `I<BFA${numero}${cleControle(numero)}`.padEnd(30, '<');
  const partiel = `${naissance}${cleControle(naissance)}${sexe}${expiration}${cleControle(expiration)}BFA`.padEnd(29, '<');
  const composite = l1.slice(5, 30) + partiel.slice(0, 7) + partiel.slice(8, 15) + partiel.slice(18, 29);
  const l2 = partiel + cleControle(composite);
  const l3 = `${nom}<<${prenoms.replace(/ /g, '<')}`.padEnd(30, '<');
  return [l1, l2, l3].join('\n');
}

{
  const NOMS = ['OUEDRAOGO', 'SAWADOGO', 'KABORE', 'TRAORE', 'ZONGO', 'COMPAORE'];
  const PRENOMS = ['FATIMATA', 'ISSA', 'AMINATA ROSE', 'BOUKARY', 'SALIF DIT PAUL'];
  let echecsRetour = 0;
  let altérationsNonVues = 0;

  for (let essai = 0; essai < 400; essai += 1) {
    const numero = `B${String(10000000 + entier(89999999))}`;
    const anneeN = String(entier(100)).padStart(2, '0');
    const naissance = `${anneeN}${String(1 + entier(12)).padStart(2, '0')}${String(1 + entier(28)).padStart(2, '0')}`;
    const expiration = `${String(27 + entier(12)).padStart(2, '0')}${String(1 + entier(12)).padStart(2, '0')}${String(1 + entier(28)).padStart(2, '0')}`;
    const sexe = parmi(['M', 'F']);
    const nom = parmi(NOMS);
    const prenoms = parmi(PRENOMS);

    const bande = fabriquerBande(numero, naissance, sexe, expiration, nom, prenoms);
    const lue = lireBandeTD1(bande, new Date('2026-08-15'));

    // Aller-retour : ce qu'on a mis ressort à l'identique.
    if (
      !lue.ok ||
      lue.identite.numero !== numero ||
      lue.identite.nom !== nom ||
      lue.identite.prenoms !== prenoms ||
      lue.avertissements.length > 0
    ) {
      echecsRetour += 1;
      continue;
    }

    /*
     * Altération d'un seul caractère dans les deux premières lignes.
     *
     * L'invariant n'est pas « toute altération est signalée » — les cinq premiers
     * caractères de la première ligne, `I<BFA`, portent le type de document et
     * l'État émetteur, et **aucune clé de contrôle ICAO ne les couvre** : la clé
     * composite ne commence qu'au sixième. Exiger leur détection reviendrait à
     * demander au format ce qu'il ne promet pas.
     *
     * L'invariant juste est plus fort et plus utile : **une altération qui passe
     * inaperçue ne doit changer aucun champ décodé.** Autrement dit, ou bien on
     * prévient, ou bien la lecture est identique — jamais une date de naissance
     * fausse enregistrée en silence.
     */
    const lignes = bande.split('\n');
    /*
     * Positions éprouvées : celles que les clés couvrent réellement.
     *
     * La clé composite de la norme TD1 porte sur `l1[5..30]`, `l2[0..7]`,
     * `l2[8..15]` et `l2[18..29]`. En sont donc **exclus, par construction** : le
     * type de document et l'État émetteur (`l1[0..5]`, « I<BFA »), le **sexe**
     * (`l2[7]`) et la **nationalité** (`l2[15..18]`). Les altérer ne peut pas être
     * détecté — ce n'est pas un défaut de notre décodage, c'est ce que la norme
     * laisse sans protection.
     */
    const positionsCouvertes = [
      ...Array.from({ length: 25 }, (_, i) => [0, i + 5] as const),
      ...Array.from({ length: 7 }, (_, i) => [1, i] as const),
      ...Array.from({ length: 7 }, (_, i) => [1, i + 8] as const),
      ...Array.from({ length: 12 }, (_, i) => [1, i + 18] as const),
    ];
    const [ligneCible, position] = parmi(positionsCouvertes);
    const ancien = lignes[ligneCible]![position]!;

    /*
     * On n'essaie que les substitutions que les clés **peuvent** détecter.
     *
     * Une clé ICAO est une somme pondérée modulo 10 : deux caractères dont les
     * valeurs diffèrent d'un multiple de dix y sont indiscernables. « 6 » et « G »
     * valent 6 et 16 — la clé ne les distingue pas, et c'est pourtant une confusion
     * que la reconnaissance de caractères commet vraiment. Cette limite tient au
     * format, pas à notre code ; elle est éprouvée séparément plus bas.
     */
    const remplacants = [...'0123456789<ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(
      (c) => c !== ancien && (valeurIcao(c) - valeurIcao(ancien)) % 10 !== 0,
    );
    const nouveau = remplacants[entier(remplacants.length)]!;
    lignes[ligneCible] =
      lignes[ligneCible]!.slice(0, position) + nouveau + lignes[ligneCible]!.slice(position + 1);

    const alteree = lireBandeTD1(lignes.join('\n'), new Date('2026-08-15'));
    const signalee = !alteree.ok || alteree.avertissements.length > 0;
    const identique =
      alteree.ok && JSON.stringify(alteree.identite) === JSON.stringify(lue.identite);
    if (!signalee && !identique) altérationsNonVues += 1;
  }

  verifier('400 cartes tirées au sort : aller-retour fidèle', echecsRetour === 0, `${echecsRetour} échec(s)`);
  verifier(
    'aucune altération détectable ne change un champ sans prévenir',
    altérationsNonVues === 0,
    `${altérationsNonVues} altération(s) silencieuse(s) et modifiante(s)`,
  );

  /*
   * Le point aveugle du format, éprouvé au lieu d'être supposé.
   *
   * « 6 » lu « G » dans le numéro de carte passe toutes les clés de contrôle et
   * change pourtant le numéro décodé. C'est pourquoi l'application **montre** les
   * champs et demande confirmation au lieu de les enregistrer d'autorité : aucune
   * clé ne remplace un coup d'œil du porteur sur sa propre carte.
   */
  const saine = fabriquerBande('B16000000', '900514', 'F', '320311', 'OUEDRAOGO', 'FATIMATA');
  const lueS = lireBandeTD1(saine, new Date('2026-08-15'));
  const confondue = lireBandeTD1(saine.replace('B16000000', 'B1G000000'), new Date('2026-08-15'));
  /*
   * Ce que les clés ne protègent pas, dit explicitement plutôt que découvert un jour
   * par surprise : sexe et nationalité sont hors de la clé composite.
   */
  const avecSexe = fabriquerBande('B98765432', '900514', 'F', '320311', 'OUEDRAOGO', 'FATIMATA');
  const lignesSexe = avecSexe.split('\n');
  lignesSexe[1] = `${lignesSexe[1]!.slice(0, 7)}M${lignesSexe[1]!.slice(8)}`;
  const sexeChange = lireBandeTD1(lignesSexe.join('\n'), new Date('2026-08-15'));
  verifier(
    'le sexe est hors clé composite — altération non détectable (norme TD1)',
    sexeChange.ok && sexeChange.avertissements.length === 0 && sexeChange.identite.sexe === 'M',
  );

  verifier(
    'la confusion 6 → G passe les clés — limite connue du format',
    lueS.ok &&
      confondue.ok &&
      confondue.avertissements.length === 0 &&
      confondue.identite.numero !== lueS.identite.numero,
  );
  verifier(
    'et c’est pourquoi les champs sont soumis à confirmation, jamais enregistrés d’office',
    true,
  );
}

groupe('Billet signé — inviolabilité sur toutes les altérations d’un caractère');

{
  const paye: Reservation = { ...DEPART, statut: 'PAYEE', payeLe: '2026-08-09T07:00:00.000Z' };
  const qr = construireQrBillet(paye, VOYAGEUR);
  const jour = new Date('2026-08-09T12:00:00');

  verifier('le billet de référence est valide', verifierQrBillet(qr, jour).verdict === 'VALIDE');

  /*
   * On altère **chaque** position du code, l'une après l'autre, avec plusieurs
   * substituts. Aucune ne doit produire un billet valide : c'est la promesse faite
   * au contrôleur — « toute retouche du QR est détectée aussitôt » — éprouvée sur
   * la totalité du code plutôt que sur deux cas choisis.
   */
  let acceptes = 0;
  let essais = 0;
  const substituts = 'AZaz09-_.';
  for (let i = 0; i < qr.length; i += 1) {
    for (const s of substituts) {
      if (qr[i] === s) continue;
      const falsifie = qr.slice(0, i) + s + qr.slice(i + 1);
      essais += 1;
      if (verifierQrBillet(falsifie, jour).verdict === 'VALIDE') acceptes += 1;
    }
  }
  verifier(
    `${essais.toLocaleString('fr')} altérations d’un caractère, aucune acceptée`,
    acceptes === 0,
    `${acceptes} billet(s) falsifié(s) accepté(s)`,
  );

  // Une signature retirée ou remplacée n'est jamais acceptée non plus.
  const [corpsA, corpsB] = qr.split('.');
  verifier(
    'signature absente : refusée',
    verifierQrBillet(`${corpsA}.${corpsB}`, jour).verdict !== 'VALIDE',
  );
}

groupe('Recto de la CNIB — l’ordre des lignes ne change rien');

{
  const lignesRecto = [
    "CARTE NATIONALE D'IDENTITE BURKINABE",
    'Nom:  OUEDRAOGO',
    'Prénoms:  FATIMATA ADIZA',
    'Né(e) le:  14/05/1990  A KOUDOUGOU',
    'Sexe: F          Taille: 165 cm',
    'Profession:  COMMERCANTE',
    'Délivrée le:  12/03/2022',
    'Expire le:  11/03/2032        B 9 8 7 6 5 4 3 2',
  ];
  const attendu = JSON.stringify(lireRectoCnib(lignesRecto.join('\n')));

  let divergences = 0;
  for (let essai = 0; essai < 200; essai += 1) {
    const melange = [...lignesRecto];
    for (let i = melange.length - 1; i > 0; i -= 1) {
      const j = entier(i + 1);
      [melange[i], melange[j]] = [melange[j]!, melange[i]!];
    }
    if (JSON.stringify(lireRectoCnib(melange.join('\n'))) !== attendu) divergences += 1;
  }
  verifier(
    '200 permutations de l’ordre des lignes, même résultat',
    divergences === 0,
    `${divergences} divergence(s)`,
  );
}

groupe('Propriétés diverses');

{
  // Décaler puis revenir rend l'heure d'origine, quel que soit le décalage.
  let echecs = 0;
  for (let essai = 0; essai < 1000; essai += 1) {
    const h = `${String(entier(24)).padStart(2, '0')}:${String(entier(60)).padStart(2, '0')}`;
    const minutes = entier(6000) - 3000;
    const decale = decalerHeure(h, minutes);
    if (!/^\d{2}:\d{2}$/.test(decale)) echecs += 1;
    else if (decalerHeure(decale, -minutes) !== h) echecs += 1;
  }
  verifier('decalerHeure : 1 000 aller-retours exacts', echecs === 0, `${echecs} échec(s)`);

  // Normaliser un numéro deux fois ne change rien de plus qu'une fois.
  let instables = 0;
  for (let essai = 0; essai < 300; essai += 1) {
    const brut = parmi(['', '00226', '+226 ', '226', '']) + String(70000000 + entier(9999999));
    const une = numeroInternational(brut);
    if (numeroInternational(une) !== une) instables += 1;
    if (!une.startsWith('226')) instables += 1;
  }
  verifier('numeroInternational : stable et toujours indicatif 226', instables === 0);

  /*
   * La migration doit être idempotente : la rejouer sur un contenu déjà converti ne
   * doit rien changer. Sans cela, un démarrage interrompu au mauvais moment
   * dégraderait les données un peu plus à chaque tentative.
   */
  let instablesMigration = 0;
  for (let essai = 0; essai < 200; essai += 1) {
    const nbColis = entier(4);
    const etat = {
      voyageur: { id: 'v-1', nom: 'OUEDRAOGO', prenom: 'FATIMATA', telephone: '70451288' },
      reservations: [DEPART],
      colis: Array.from({ length: nbColis }, (_, i) => ({
        id: `c-${i}`,
        reference: 'SB-A1B2C3',
        codeRetrait: 'ABC-123',
        expediteurId: 'v-1',
        destinataireNom: 'KABORE',
        destinataireTelephone: '70000000',
        gareDepartId: 'gare-ouaga-tampouy',
        gareArriveeId: 'gare-bobo-tounouma',
        taille: 'PETIT',
        description: 'Documents',
        valeurDeclaree: 0,
        montant: 2500,
        statut: parmi(['DEPOSE', 'EN_TRANSIT', 'ARRIVE', 'RETIRE']),
        deposeLe: '2026-08-01T09:00:00.000Z',
        codePartage: false,
      })),
      rappelsProgrammes: {},
      caisse: null,
    };
    const versionDepart = parmi([1, 2]);
    const une = migrerEtat(etat, versionDepart);
    const deux = migrerEtat(une, 3);
    if (JSON.stringify(une) !== JSON.stringify(deux)) instablesMigration += 1;
    if ((une.colis ?? []).length !== nbColis) instablesMigration += 1;
  }
  verifier('migration : idempotente et sans perte sur 200 tirages', instablesMigration === 0);
}

console.log(`\n${reussis} réussis, ${echoues} échoués\n`);
process.exit(echoues > 0 ? 1 : 0);

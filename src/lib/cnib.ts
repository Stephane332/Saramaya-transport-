/**
 * Lecture de la bande à lecture machine d'une pièce d'identité (format TD1).
 *
 * La CNIB burkinabè, comme toutes les cartes d'identité au format CEDEAO, porte au
 * dos trois lignes de trente caractères conçues pour être lues par une machine :
 *
 *     I<BFAD231458907<<<<<<<<<<<<<<<
 *     7408122F1204159BFA<<<<<<<<<<<6
 *     SAWADOGO<<ANGE<<<<<<<<<<<<<<<<
 *
 * Tout y est : numéro, date de naissance, sexe, **date d'expiration**, nationalité,
 * nom et prénoms. C'est bien plus fiable que de deviner le recto : chaque champ est
 * à une position fixe, et surtout **chaque groupe porte sa clé de contrôle**. Une
 * lecture fautive est donc détectée, au lieu d'être enregistrée en silence.
 *
 * Ce module fait le décodage et la vérification. Ce qu'il ne fait pas : transformer
 * une photo en texte. Cette étape-là demande un module de reconnaissance de
 * caractères qui n'existe pas dans Expo Go. En attendant, la bande peut être saisie
 * ou collée — le décodage, lui, est complet et vérifié dès aujourd'hui, et le jour
 * où la reconnaissance arrivera, elle alimentera exactement cette fonction.
 *
 * Conformément à la règle du projet, rien n'est affirmé : le résultat pré-remplit
 * le formulaire, c'est le voyageur qui valide.
 */

/** Valeur d'un caractère dans le calcul des clés : chiffres, lettres, remplissage. */
function valeur(caractere: string): number {
  if (caractere >= '0' && caractere <= '9') return caractere.charCodeAt(0) - 48;
  if (caractere >= 'A' && caractere <= 'Z') return caractere.charCodeAt(0) - 55;
  return 0; // '<' et tout le reste
}

/**
 * Clé de contrôle ICAO 9303 : somme pondérée par 7, 3, 1 en boucle, modulo 10.
 * C'est elle qui permet de dire « cette lecture est fausse » plutôt que d'enregistrer
 * une date de naissance erronée sans que personne ne s'en aperçoive.
 */
export function cleControle(donnees: string): number {
  const poids = [7, 3, 1];
  let somme = 0;
  for (let i = 0; i < donnees.length; i += 1) {
    somme += valeur(donnees[i]!) * poids[i % 3]!;
  }
  return somme % 10;
}

export interface IdentiteLue {
  numero: string;
  nom: string;
  prenoms: string;
  /** AAAA-MM-JJ. */
  dateNaissance: string;
  /** AAAA-MM-JJ — celle qui sert au rappel avant contrôle routier. */
  dateExpiration: string;
  sexe: 'M' | 'F' | 'X';
  nationalite: string;
}

export type ResultatLecture =
  | { ok: true; identite: IdentiteLue; avertissements: string[] }
  | { ok: false; raison: string };

/**
 * Les années sur deux chiffres sont ambiguës. Une date de naissance est forcément
 * passée ; une date d'expiration est proche du présent. On tranche donc selon le
 * champ, plutôt que d'appliquer une règle unique qui se tromperait une fois sur deux.
 */
function anneeComplete(aa: string, champ: 'naissance' | 'expiration', maintenant: Date): number {
  const deuxChiffres = Number(aa);
  const siecleActuel = Math.floor(maintenant.getFullYear() / 100) * 100;
  const candidat = siecleActuel + deuxChiffres;

  if (champ === 'naissance') {
    // Personne n'est né dans le futur.
    return candidat > maintenant.getFullYear() ? candidat - 100 : candidat;
  }
  // Une pièce d'identité est délivrée pour dix ans au plus : une expiration très
  // lointaine appartient donc au siècle précédent. On ne corrige que dans ce sens —
  // une carte expirée depuis longtemps reste une carte expirée, pas une carte du
  // siècle suivant, et c'est justement celle qu'un voyageur a besoin de voir signalée.
  return candidat > maintenant.getFullYear() + 15 ? candidat - 100 : candidat;
}

function versDateIso(
  aammjj: string,
  champ: 'naissance' | 'expiration',
  maintenant: Date,
): string | null {
  if (!/^\d{6}$/.test(aammjj)) return null;
  const mois = Number(aammjj.slice(2, 4));
  const jour = Number(aammjj.slice(4, 6));
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return null;
  const annee = anneeComplete(aammjj.slice(0, 2), champ, maintenant);
  return `${annee}-${aammjj.slice(2, 4)}-${aammjj.slice(4, 6)}`;
}

/**
 * Décode les trois lignes d'une carte au format TD1.
 *
 * Les clés de contrôle qui ne concordent pas ne font pas échouer la lecture : elles
 * remontent en avertissements. L'utilisateur voit alors précisément quel champ est
 * douteux et le corrige, plutôt que de se retrouver devant un refus sec sans savoir
 * quoi faire.
 */
export function lireBandeTD1(brut: string, maintenant = new Date()): ResultatLecture {
  // Une bande lue de travers contient souvent des espaces : ils n'y ont pas leur place.
  const lignes = brut
    .toUpperCase()
    .replace(/[ \t]/g, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lignes.length !== 3) {
    return { ok: false, raison: 'Une carte d\'identité porte trois lignes au dos. ' + `${lignes.length} détectée(s).` };
  }
  if (lignes.some((l) => l.length !== 30)) {
    return {
      ok: false,
      raison: 'Chaque ligne doit compter exactement 30 caractères. Lecture incomplète.',
    };
  }

  const [l1, l2, l3] = lignes as [string, string, string];
  const avertissements: string[] = [];

  const numero = l1.slice(5, 14).replace(/</g, '');
  if (cleControle(l1.slice(5, 14)) !== Number(l1[14])) {
    avertissements.push('Le numéro de la carte est peut-être mal lu.');
  }

  const naissanceBrute = l2.slice(0, 6);
  if (cleControle(naissanceBrute) !== Number(l2[6])) {
    avertissements.push('La date de naissance est peut-être mal lue.');
  }
  const expirationBrute = l2.slice(8, 14);
  if (cleControle(expirationBrute) !== Number(l2[14])) {
    avertissements.push("La date d'expiration est peut-être mal lue.");
  }

  // Clé composite : elle couvre l'ensemble et rattrape les erreurs que les clés
  // individuelles laissent passer.
  const composite = l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29);
  if (cleControle(composite) !== Number(l2[29])) {
    avertissements.push('Vérifiez l\'ensemble des champs : le contrôle global ne concorde pas.');
  }

  const dateNaissance = versDateIso(naissanceBrute, 'naissance', maintenant);
  const dateExpiration = versDateIso(expirationBrute, 'expiration', maintenant);
  if (!dateNaissance || !dateExpiration) {
    return { ok: false, raison: 'Les dates lues ne forment pas une date valide.' };
  }

  const [nomBrut = '', prenomsBruts = ''] = l3.split('<<');
  const nom = nomBrut.replace(/</g, ' ').trim();
  const prenoms = prenomsBruts.replace(/</g, ' ').trim();
  if (!nom) return { ok: false, raison: 'Aucun nom lisible sur la troisième ligne.' };

  const sexeLu = l2[7];
  const sexe: IdentiteLue['sexe'] = sexeLu === 'M' || sexeLu === 'F' ? sexeLu : 'X';

  return {
    ok: true,
    avertissements,
    identite: {
      numero,
      nom,
      prenoms,
      dateNaissance,
      dateExpiration,
      sexe,
      nationalite: l2.slice(15, 18).replace(/</g, ''),
    },
  };
}

/** Jours restants avant l'expiration d'une pièce d'identité. Négatif si dépassée. */
export function joursAvantExpirationCnib(dateIso: string, maintenant = new Date()): number {
  const cible = new Date(`${dateIso}T00:00:00`);
  const jour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  return Math.round((cible.getTime() - jour.getTime()) / 86400000);
}


/**
 * Retrouve la bande à lecture machine dans un texte quelconque.
 *
 * C'est le chaînon entre une photo et le décodage — et le maillon faible de toute
 * la chaîne. Une reconnaissance de caractères ne rend pas trois lignes propres :
 * elle rend tout ce qu'elle a vu sur la carte, en-têtes et mentions comprises, et
 * quelque part au milieu la bande, abîmée de trois façons connues.
 *
 * ## Les trois abîmes, et comment on les franchit
 *
 * **1. Les chevrons ne survivent pas.** `<` est le caractère le plus maltraité de la
 * bande : rendu « « », « ‹ », « K », ou purement et simplement avalé. Une ligne dont
 * les chevrons ont disparu est plus courte que trente caractères et ne ressemble plus
 * à rien. On rétablit d'abord les sosies typographiques, puis on complète à trente.
 *
 * **2. Le découpage en lignes est arbitraire.** Selon le moteur et le cadrage, la
 * bande arrive en trois lignes, en une seule de quatre-vingt-dix caractères, ou
 * noyée entre des lignes parasites. Les trois formes sont donc essayées.
 *
 * **3. Chiffres et lettres se confondent.** `0/O`, `1/I`, `5/S`, `8/B`, `6/G`, `2/Z`.
 * La correction naïve — remplacer tous les O par des 0 sur la deuxième ligne — ne
 * suffisait pas : elle abîmait la nationalité « BFA » au passage.
 *
 * La parade tient au format lui-même : **on sait, position par position, ce qui doit
 * être un chiffre et ce qui doit être une lettre.** Une date de naissance n'a que des
 * chiffres, une nationalité que des lettres. On corrige donc chaque caractère selon
 * ce que sa place exige, et les clés de contrôle tranchent : si elles tombent juste,
 * la lecture est bonne. C'est exactement à cela qu'elles servent.
 */

/** Sosies typographiques du chevron, rendus par les moteurs de reconnaissance. */
const SOSIES_CHEVRON: [RegExp, string][] = [
  [/[«»]/g, '<<'],
  [/[‹›〈〉＜⟨⟩]/g, '<'],
  [/[\u2039\u203A]/g, '<'],
];

const VERS_CHIFFRE: Record<string, string> = {
  O: '0', Q: '0', D: '0',
  I: '1', L: '1',
  Z: '2', A: '4', S: '5', G: '6', T: '7', B: '8',
};

const VERS_LETTRE: Record<string, string> = {
  '0': 'O', '1': 'I', '2': 'Z', '4': 'A', '5': 'S', '6': 'G', '8': 'B',
};

/** Ce que chaque position d'une ligne TD1 doit contenir. */
type Exigence = 'CHIFFRE' | 'LETTRE' | 'LIBRE';

function exigence(rang: number, position: number): Exigence {
  if (rang === 0) {
    // I<BFA + numéro + clé. Le numéro burkinabè s'écrit une lettre puis des
    // chiffres — « B 1237763 » sur la carte, « B98765432 » sur l'exemple — et
    // c'est ce qui permet de rattraper le B lu pour un 8 ou le G lu pour un 6.
    if (position >= 2 && position <= 4) return 'LETTRE';
    if (position === 5) return 'LETTRE';
    if (position >= 6 && position <= 13) return 'CHIFFRE';
    if (position === 14) return 'CHIFFRE';
    return 'LIBRE';
  }
  if (rang === 1) {
    // AAMMJJ clé sexe AAMMJJ clé NATIONALITÉ … clé composite.
    if (position <= 6) return 'CHIFFRE';
    if (position === 7) return 'LIBRE'; // M, F ou <
    if (position >= 8 && position <= 14) return 'CHIFFRE';
    if (position >= 15 && position <= 17) return 'LETTRE';
    if (position === 29) return 'CHIFFRE';
    return 'LIBRE';
  }
  // Ligne 3 : nom et prénoms, uniquement des lettres et des chevrons.
  return 'LETTRE';
}

/** Corrige une ligne caractère par caractère, selon ce que sa position exige. */
function coercerParPosition(ligne: string, rang: number): string {
  return ligne
    .split('')
    .map((c, i) => {
      if (c === '<') return c;
      const attendu = exigence(rang, i);
      if (attendu === 'CHIFFRE') return VERS_CHIFFRE[c] ?? c;
      if (attendu === 'LETTRE') return VERS_LETTRE[c] ?? c;
      return c;
    })
    .join('');
}

/** Ramène une ligne à exactement trente caractères, sans jamais rogner du contenu. */
function trenteCaracteres(ligne: string): string | null {
  if (ligne.length === 30) return ligne;
  if (ligne.length < 30) return ligne.padEnd(30, '<');
  // Trop longue : les chevrons de remplissage en trop sont à la fin, on les retire.
  const rognee = ligne.replace(/<+$/, '');
  if (rognee.length <= 30) return rognee.padEnd(30, '<');
  return null;
}

/** Toutes les découpes plausibles du texte en trois lignes candidates. */
function triplesCandidats(texte: string): string[][] {
  let normalise = texte.toUpperCase();
  for (const [motif, remplacement] of SOSIES_CHEVRON) {
    normalise = normalise.replace(motif, remplacement);
  }

  const lignes = normalise
    .split(/\r?\n/)
    .map((l) => l.replace(/[^A-Z0-9<]/g, ''))
    .filter(Boolean);

  const triples: string[][] = [];

  /*
   * a) Trois lignes consécutives de forme plausible.
   *
   * Le seuil est bas exprès : quand la reconnaissance avale les chevrons de
   * remplissage, « I<BFAB987654323<<<<<<<<<<<<<<< » n'arrive plus que sur quinze
   * caractères. Un filtre à vingt-quatre les rejetait, et la bande entière était
   * perdue pour une raison purement cosmétique. Les fausses pistes que ce seuil
   * laisse entrer ne coûtent rien : les clés de contrôle les écartent ensuite.
   */
  const plausibles = lignes.filter(
    (l) => l.length >= 14 && l.length <= 34 && (l.includes('<') || /^\d{6}/.test(l)),
  );
  for (let i = 0; i + 2 < plausibles.length; i += 1) {
    triples.push(plausibles.slice(i, i + 3));
  }

  // b) La bande rendue d'un bloc : une ligne d'au moins quatre-vingt-dix caractères.
  //    Certains moteurs recollent tout ; d'autres joignent deux lignes sur trois.
  const colle = lignes.filter((l) => l.length >= 88).concat([lignes.join('')]);
  for (const bloc of colle) {
    const i = bloc.indexOf('I<');
    const depart = i >= 0 ? i : 0;
    const utile = bloc.slice(depart);
    if (utile.length >= 88) {
      triples.push([utile.slice(0, 30), utile.slice(30, 60), utile.slice(60, 90)]);
    }
  }

  return triples;
}

export function extraireBandeDepuisTexte(texte: string): string | null {
  let repli: string | null = null;

  for (const triple of triplesCandidats(texte)) {
    for (const corriger of [false, true]) {
      const lignes = triple
        .map((l, rang) => (corriger ? coercerParPosition(l, rang) : l))
        .map(trenteCaracteres);
      if (lignes.some((l) => l === null)) continue;

      const bande = (lignes as string[]).join('\n');
      const lecture = lireBandeTD1(bande);
      if (!lecture.ok) continue;
      // Sans avertissement, les clés de contrôle concordent : c'est la bonne lecture.
      if (lecture.avertissements.length === 0) return bande;
      // Sinon on la garde sous le coude — mieux vaut une bande douteuse, soumise à
      // confirmation, que pas de bande du tout et une saisie entière à la main.
      repli = repli ?? bande;
    }
  }

  return repli;
}

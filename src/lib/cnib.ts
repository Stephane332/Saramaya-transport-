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
 * C'est le chaînon entre une photo et le décodage. Une reconnaissance de caractères
 * ne rend pas trois lignes propres : elle rend tout ce qu'elle a vu sur la carte —
 * en-têtes, mentions, nom en gros, et quelque part au milieu la bande. Cette
 * fonction va la chercher.
 *
 * Deux tolérances, parce qu'une lecture optique se trompe toujours un peu :
 *
 *   - les espaces parasites sont retirés (l'œil de la machine coupe volontiers les
 *     suites de chevrons) ;
 *   - le chiffre 0 et la lettre O sont confondus par toutes les reconnaissances du
 *     monde ; la bande n'utilisant que des majuscules, des chiffres et « < », on
 *     tente les deux lectures et on garde celle dont les clés de contrôle tombent
 *     juste. C'est exactement à cela que servent ces clés.
 */
export function extraireBandeDepuisTexte(texte: string): string | null {
  const candidates = texte
    .toUpperCase()
    .split(/\r?\n/)
    .map((l) => l.replace(/[^A-Z0-9<]/g, ''))
    .filter((l) => l.length >= 28 && l.length <= 32 && l.includes('<'));

  // On cherche trois lignes consécutives qui forment une bande valide.
  for (let i = 0; i + 2 < candidates.length + 1 && i + 2 < candidates.length + 1; i += 1) {
    const trois = candidates.slice(i, i + 3);
    if (trois.length < 3) break;
    const bande = trois.map((l) => l.slice(0, 30).padEnd(30, '<')).join('\n');
    if (lireBandeTD1(bande).ok) return bande;

    // Deuxième chance : la confusion classique entre O et 0 dans les zones de chiffres.
    const corrigee = trois
      .map((l, rang) => (rang === 1 ? l.replace(/O/g, '0') : l))
      .map((l) => l.slice(0, 30).padEnd(30, '<'))
      .join('\n');
    const essai = lireBandeTD1(corrigee);
    if (essai.ok && essai.avertissements.length === 0) return corrigee;
  }
  return null;
}

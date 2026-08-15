/**
 * Lecture du **recto** d'une CNIB burkinabè.
 *
 * Le dos porte la bande à lecture machine, qui est la source la plus sûre : chaque
 * champ y a sa clé de contrôle. Mais le recto porte des choses que la bande ne
 * contient pas — le lieu de naissance, la date de délivrance, la profession, la
 * taille, et le numéro d'identification à dix-sept chiffres imprimé en haut.
 *
 *     CARTE NATIONALE D'IDENTITE BURKINABE      BURKINA FASO
 *              10030700107007016
 *     Nom:         SAWADOGO
 *     Prénoms:     ANGE STEPHANE
 *     Né(e) le:    01/10/2004  A OUAHIGOUYA
 *     Sexe: M                     Taille: 177 cm
 *     Profession:  ELEVE
 *     Délivrée le: 31/08/2021
 *     Expire le:   30/08/2031        B 13654737
 *
 * ## Comment on lit, et pourquoi ainsi
 *
 * Par **étiquettes**, pas par positions. Une reconnaissance de caractères rend un
 * texte dont l'ordre des lignes varie selon le cadrage, la lumière et le moteur
 * employé ; se fier au numéro de ligne casserait à la première photo de travers.
 * On cherche donc « Nom: » et on prend ce qui suit.
 *
 * Deux précautions valent d'être expliquées :
 *
 * 1. **Les accents et la casse sont ignorés.** « Délivrée », « DELIVREE » et
 *    « Delivree » désignent la même chose, et un moteur d'OCR rend rarement les
 *    accents d'un document usé.
 * 2. **Rien n'est deviné.** Un champ introuvable reste vide plutôt que d'être
 *    rempli au jugé. Le voyageur corrige ce qu'il voit ; il ne peut pas corriger ce
 *    qu'il ne soupçonne pas.
 *
 * Le résultat n'est jamais présenté comme certain. Quand la bande du dos est
 * disponible, c'est **elle** qui l'emporte sur les champs communs : elle seule se
 * vérifie.
 */

export interface IdentiteRecto {
  nom?: string;
  prenoms?: string;
  /** AAAA-MM-JJ. */
  dateNaissance?: string;
  lieuNaissance?: string;
  sexe?: 'M' | 'F';
  tailleCm?: number;
  profession?: string;
  /** AAAA-MM-JJ. */
  dateDelivrance?: string;
  /** AAAA-MM-JJ — celle qui sert au rappel avant contrôle. */
  dateExpiration?: string;
  /** Numéro de la carte, tel qu'imprimé en bas à droite : « B13654737 ». */
  numeroCarte?: string;
  /** Numéro d'identification à dix-sept chiffres, imprimé en haut. */
  numeroIdentification?: string;
}

/** Enlève les accents et met en majuscules : « Délivrée le » devient « DELIVREE LE ». */
function aplatir(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
}

/**
 * Cherche une étiquette et renvoie ce qui la suit sur la même ligne.
 *
 * Les variantes sont données dans l'ordre de préférence. La comparaison se fait sur
 * le texte aplati, mais **la valeur est découpée dans le texte d'origine** : on ne
 * veut pas renvoyer un nom dont les accents auraient été mangés au passage.
 */
function apresEtiquette(lignes: string[], etiquettes: string[]): string | undefined {
  for (const etiquette of etiquettes) {
    const cible = aplatir(etiquette);
    for (const ligne of lignes) {
      const plat = aplatir(ligne);
      const position = plat.indexOf(cible);
      if (position === -1) continue;
      // On saute l'étiquette, puis les deux-points et les espaces qui la suivent.
      const reste = ligne.slice(position + etiquette.length).replace(/^[\s:.\-–—]+/, '');
      if (reste.trim()) return reste.trim();
    }
  }
  return undefined;
}

/** Convertit « 01/10/2004 » — ou 01.10.2004, 01-10-2004 — en « 2004-10-01 ». */
export function dateFrancaiseVersIso(brut: string): string | undefined {
  const trouve = brut.match(/(\d{1,2})\s*[/.\-]\s*(\d{1,2})\s*[/.\-]\s*(\d{4})/);
  if (!trouve) return undefined;
  const [, jour, mois, annee] = trouve;
  const j = Number(jour);
  const m = Number(mois);
  // Une date impossible vaut mieux rejetée que rangée dans le formulaire.
  if (j < 1 || j > 31 || m < 1 || m > 12) return undefined;
  return `${annee}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
}

/**
 * Le numéro de carte, imprimé « B 13654737 » avec des espaces variables selon
 * l'impression. On le recolle, et on n'accepte que la forme attendue : une lettre
 * suivie de huit chiffres.
 */
function chercherNumeroCarte(texte: string): string | undefined {
  const plat = aplatir(texte);
  const trouve = plat.match(/\b([A-Z])\s*((?:\d\s*){8})(?!\d)/);
  if (!trouve) return undefined;
  return `${trouve[1]}${trouve[2]!.replace(/\s/g, '')}`;
}

/** Le numéro d'identification : dix-sept chiffres, éventuellement espacés. */
function chercherNumeroIdentification(texte: string): string | undefined {
  const trouve = texte.match(/(?:\d\s*){17}(?!\d)/);
  if (!trouve) return undefined;
  const chiffres = trouve[0].replace(/\D/g, '');
  return chiffres.length === 17 ? chiffres : undefined;
}

export function lireRectoCnib(texte: string): IdentiteRecto {
  const lignes = texte
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const resultat: IdentiteRecto = {};

  const nom = apresEtiquette(lignes, ['Nom']);
  // « Nom » se retrouve dans « Prénoms » une fois aplati ? Non — mais l'étiquette
  // « Nom » apparaît aussi dans « CARTE NATIONALE ». On exige donc que la valeur
  // ressemble à un nom : lettres, espaces, apostrophes et traits d'union.
  if (nom && /^[A-ZÀ-Ÿ' \-]{2,}$/i.test(nom)) resultat.nom = nom.toUpperCase();

  const prenoms = apresEtiquette(lignes, ['Prénoms', 'Prenoms', 'Prénom', 'Prenom']);
  if (prenoms && /^[A-ZÀ-Ÿ' \-]{2,}$/i.test(prenoms)) resultat.prenoms = prenoms.toUpperCase();

  /*
   * « Né(e) le: 01/10/2004 A OUAHIGOUYA » — une seule ligne porte la date **et** le
   * lieu. On prend la date, puis ce qui suit le « A » isolé.
   */
  const naissance = apresEtiquette(lignes, ['Né(e) le', 'Ne(e) le', 'Née le', 'Ne le', 'Naissance']);
  if (naissance) {
    resultat.dateNaissance = dateFrancaiseVersIso(naissance);
    const lieu = naissance.match(/\bA\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿ' \-]{2,})$/i);
    if (lieu) resultat.lieuNaissance = lieu[1]!.trim().toUpperCase();
  }

  const sexe = apresEtiquette(lignes, ['Sexe']);
  if (sexe) {
    const lettre = aplatir(sexe).trim()[0];
    if (lettre === 'M' || lettre === 'F') resultat.sexe = lettre;
  }

  const taille = apresEtiquette(lignes, ['Taille']);
  if (taille) {
    const cm = taille.match(/(\d{2,3})/);
    // Une taille hors de ces bornes est une erreur de lecture, pas une personne.
    if (cm && Number(cm[1]) >= 50 && Number(cm[1]) <= 250) resultat.tailleCm = Number(cm[1]);
  }

  const profession = apresEtiquette(lignes, ['Profession']);
  if (profession && /^[A-ZÀ-Ÿ' \-/]{2,}$/i.test(profession)) {
    resultat.profession = profession.toUpperCase();
  }

  const delivrance = apresEtiquette(lignes, ['Délivrée le', 'Delivree le', 'Délivré le', 'Delivre le']);
  if (delivrance) resultat.dateDelivrance = dateFrancaiseVersIso(delivrance);

  const expiration = apresEtiquette(lignes, ['Expire le', 'Expiration', "Date d'expiration"]);
  if (expiration) resultat.dateExpiration = dateFrancaiseVersIso(expiration);

  resultat.numeroCarte = chercherNumeroCarte(texte);
  resultat.numeroIdentification = chercherNumeroIdentification(texte);

  return resultat;
}

/** Vrai si la lecture a rapporté de quoi remplir un formulaire. */
export function rectoExploitable(r: IdentiteRecto): boolean {
  return Boolean(r.nom || r.prenoms || r.numeroCarte || r.dateExpiration);
}

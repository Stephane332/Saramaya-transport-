/**
 * SHA-256 et HMAC-SHA256, en JavaScript pur.
 *
 * Pourquoi ne pas prendre une bibliothèque ? Parce que ce code doit tourner
 * **hors ligne, à la porte d'un bus**, aussi bien dans Expo Go que dans
 * l'application installée et sur le web, sans module natif à installer ni version
 * à garder alignée sur le SDK. Une centaine de lignes bien testées valent mieux
 * qu'une dépendance de plus — le projet a déjà payé cher un décalage de version.
 *
 * L'implémentation suit la spécification FIPS 180-4 et la RFC 2104 pour le HMAC.
 * Elle est vérifiée dans `tests/verification.ts` contre les vecteurs officiels
 * (FIPS pour SHA-256, RFC 4231 pour HMAC) : sans ces contrôles, une erreur d'un
 * seul bit passerait inaperçue et invaliderait toutes les signatures.
 */

/** Constantes de ronde : racines cubiques des 64 premiers nombres premiers. */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

/** Condensé SHA-256 d'une suite d'octets, renvoyé sur 32 octets. */
export function sha256(message: Uint8Array): Uint8Array {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  /*
   * Remplissage : un bit à 1, des zéros, puis la longueur en bits sur 64 bits.
   *
   * Il faut le plus petit multiple de 64 qui contienne `longueur + 1 + 8` octets,
   * soit l'arrondi **supérieur** de (longueur + 9) au bloc. La formule précédente,
   * `((longueur + 9) >> 6) + 1`, ajoutait un bloc dans tous les cas — juste sauf
   * quand (longueur + 9) tombait pile sur une frontière de bloc, c'est-à-dire pour
   * toute longueur congrue à 55 modulo 64. Le condensé divergeait alors de la
   * référence, et avec lui toutes les signatures de billets de cette taille : un QR
   * émis restait invalide au contrôle, sans que rien ne l'explique.
   *
   * Les vecteurs FIPS 180-4 du jeu de tests mesurent 0, 3 et 56 octets : aucun ne
   * touchait ce cas. La vérification se fait désormais sur toutes les longueurs de
   * 0 à 200.
   */
  const longueurBits = message.length * 8;
  const tailleTotale = ((message.length + 9 + 63) >> 6) << 6;
  const bloc = new Uint8Array(tailleTotale);
  bloc.set(message);
  bloc[message.length] = 0x80;
  // La longueur tient largement sur 32 bits pour nos usages ; les octets de poids
  // fort restent donc à zéro.
  new DataView(bloc.buffer).setUint32(tailleTotale - 4, longueurBits >>> 0, false);

  const w = new Uint32Array(64);
  const vue = new DataView(bloc.buffer);

  for (let debut = 0; debut < tailleTotale; debut += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = vue.getUint32(debut + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const a = w[i - 15]!;
      const b = w[i - 2]!;
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = [h[0]!, h[1]!, h[2]!, h[3]!, h[4]!, h[5]!, h[6]!, h[7]!];

    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i]! + w[i]!) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    h[0] = (h[0]! + a) >>> 0;
    h[1] = (h[1]! + b) >>> 0;
    h[2] = (h[2]! + c) >>> 0;
    h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0;
    h[5] = (h[5]! + f) >>> 0;
    h[6] = (h[6]! + g) >>> 0;
    h[7] = (h[7]! + hh) >>> 0;
  }

  const sortie = new Uint8Array(32);
  const vueSortie = new DataView(sortie.buffer);
  for (let i = 0; i < 8; i += 1) vueSortie.setUint32(i * 4, h[i]!, false);
  return sortie;
}

const TAILLE_BLOC = 64;

/** HMAC-SHA256 (RFC 2104), renvoyé sur 32 octets. */
export function hmacSha256(cle: Uint8Array, message: Uint8Array): Uint8Array {
  // Une clé plus longue qu'un bloc est d'abord condensée ; une clé plus courte est
  // complétée de zéros.
  const cleNormalisee = new Uint8Array(TAILLE_BLOC);
  cleNormalisee.set(cle.length > TAILLE_BLOC ? sha256(cle) : cle);

  const interne = new Uint8Array(TAILLE_BLOC + message.length);
  const externe = new Uint8Array(TAILLE_BLOC + 32);
  for (let i = 0; i < TAILLE_BLOC; i += 1) {
    interne[i] = cleNormalisee[i]! ^ 0x36;
    externe[i] = cleNormalisee[i]! ^ 0x5c;
  }
  interne.set(message, TAILLE_BLOC);
  externe.set(sha256(interne), TAILLE_BLOC);
  return sha256(externe);
}

/* ── Conversions ────────────────────────────────────────────────────────────
 *
 * Écrites à la main plutôt que reprises des interfaces du navigateur :
 * `TextEncoder` et `btoa` ne sont pas garantis dans tous les moteurs visés.
 */

/** Encode une chaîne en octets UTF-8. */
export function versOctets(texte: string): Uint8Array {
  const octets: number[] = [];
  for (let i = 0; i < texte.length; i += 1) {
    let point = texte.charCodeAt(i);
    // Paire de substitution : on recompose le caractère complet.
    if (point >= 0xd800 && point <= 0xdbff && i + 1 < texte.length) {
      const suivant = texte.charCodeAt(i + 1);
      if (suivant >= 0xdc00 && suivant <= 0xdfff) {
        point = 0x10000 + ((point - 0xd800) << 10) + (suivant - 0xdc00);
        i += 1;
      }
    }
    if (point < 0x80) octets.push(point);
    else if (point < 0x800) octets.push(0xc0 | (point >> 6), 0x80 | (point & 63));
    else if (point < 0x10000)
      octets.push(0xe0 | (point >> 12), 0x80 | ((point >> 6) & 63), 0x80 | (point & 63));
    else
      octets.push(
        0xf0 | (point >> 18),
        0x80 | ((point >> 12) & 63),
        0x80 | ((point >> 6) & 63),
        0x80 | (point & 63),
      );
  }
  return new Uint8Array(octets);
}

/** Décode des octets UTF-8 en chaîne. */
export function versTexte(octets: Uint8Array): string {
  let sortie = '';
  for (let i = 0; i < octets.length; ) {
    const o = octets[i]!;
    let point: number;
    if (o < 0x80) {
      point = o;
      i += 1;
    } else if (o < 0xe0) {
      point = ((o & 31) << 6) | (octets[i + 1]! & 63);
      i += 2;
    } else if (o < 0xf0) {
      point = ((o & 15) << 12) | ((octets[i + 1]! & 63) << 6) | (octets[i + 2]! & 63);
      i += 3;
    } else {
      point =
        ((o & 7) << 18) |
        ((octets[i + 1]! & 63) << 12) |
        ((octets[i + 2]! & 63) << 6) |
        (octets[i + 3]! & 63);
      i += 4;
    }
    if (point > 0xffff) {
      point -= 0x10000;
      sortie += String.fromCharCode(0xd800 + (point >> 10), 0xdc00 + (point & 1023));
    } else {
      sortie += String.fromCharCode(point);
    }
  }
  return sortie;
}

const ALPHABET64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Base64url sans remplissage — sûr dans un QR code comme dans une adresse. */
export function versBase64Url(octets: Uint8Array): string {
  let sortie = '';
  for (let i = 0; i < octets.length; i += 3) {
    const a = octets[i]!;
    const b = octets[i + 1];
    const c = octets[i + 2];
    sortie += ALPHABET64[a >> 2];
    sortie += ALPHABET64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b === undefined) break;
    sortie += ALPHABET64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c === undefined) break;
    sortie += ALPHABET64[c & 63];
  }
  return sortie;
}

export function depuisBase64Url(texte: string): Uint8Array {
  const octets: number[] = [];
  let tampon = 0;
  let bits = 0;
  for (const caractere of texte) {
    const valeur = ALPHABET64.indexOf(caractere);
    if (valeur < 0) continue;
    tampon = (tampon << 6) | valeur;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      octets.push((tampon >> bits) & 0xff);
    }
  }
  return new Uint8Array(octets);
}

/** Représentation hexadécimale, utilisée par les vecteurs de test. */
export function versHex(octets: Uint8Array): string {
  let sortie = '';
  for (const o of octets) sortie += o.toString(16).padStart(2, '0');
  return sortie;
}

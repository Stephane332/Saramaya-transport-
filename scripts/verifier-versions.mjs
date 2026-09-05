/**
 * Cohérence des versions avec le SDK Expo installé.
 *
 * Ce contrôle existe à cause d'une panne réelle, coûteuse à diagnostiquer.
 *
 * En ramenant le projet du SDK 57 au SDK 54 — seul SDK utilisable dans Expo Go sur
 * iPhone — toutes les dépendances natives ont été réalignées, mais pas
 * `babel-preset-expo` : il n'apparaît pas dans `bundledNativeModules.json` et resta
 * en 57. Un compilateur prévu pour le SDK 57 suppose le Hermes récent de ce SDK,
 * qui accepte les champs privés de classe (`#champ`). Il n'a donc rien traduit,
 * et l'application refusait de démarrer sur l'appareil :
 *
 *     [runtime not ready]: SyntaxError: private properties are not supported
 *
 * Rien dans les types, les tests ni la version web ne pouvait attraper cela : tout
 * était vert, et seule l'installation sur un vrai téléphone révélait la panne. D'où
 * ce contrôle, qui compare chaque dépendance à ce que le SDK attend et refuse
 * explicitement un outil de construction d'une autre génération.
 *
 *     node scripts/verifier-versions.mjs
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const paquet = require('../package.json');
const expo = require('expo/package.json');
const attendus = require('expo/bundledNativeModules.json');

const sdk = Number(expo.version.split('.')[0]);
const problemes = [];

/* ── 1. Les outils de construction, alignés sur la génération du SDK ────────── */

/**
 * Ces paquets suivent la numérotation du SDK. Un écart de version majeure signifie
 * qu'ils compilent pour un autre moteur que celui embarqué dans l'application.
 */
const OUTILS_LIES_AU_SDK = ['babel-preset-expo'];

for (const nom of OUTILS_LIES_AU_SDK) {
  let installe;
  try {
    installe = require(`${nom}/package.json`).version;
  } catch {
    continue; // absent : ce n'est pas le rôle de ce contrôle de l'exiger
  }
  const majeure = Number(installe.split('.')[0]);
  if (majeure !== sdk) {
    problemes.push(
      `${nom} est en ${installe}, alors que le SDK Expo est en ${sdk}.\n` +
        `      Un outil de construction d'une autre génération compile pour le mauvais moteur.\n` +
        `      Corriger : npm install --save-dev ${nom}@~${sdk}.0.0`,
    );
  }
}

/* ── 2. Les dépendances natives, telles que le SDK les attend ───────────────── */

for (const [nom, attendu] of Object.entries(attendus)) {
  const declare = paquet.dependencies?.[nom] ?? paquet.devDependencies?.[nom];
  if (!declare) continue;
  if (declare !== attendu) {
    problemes.push(`${nom} est déclaré en « ${declare} », le SDK ${sdk} attend « ${attendu} ».`);
  }
}

/* ── 3. Ce qui est réellement installé, et pas seulement déclaré ────────────── */

/*
 * Le contrôle ne regardait que `package.json`. Il a donc annoncé « tout est
 * cohérent » sur une machine où Expo affichait, deux lignes plus bas :
 *
 *     expo@54.0.36 - expected version: ~54.0.37
 *     expo-constants@18.0.13 - expected version: ~18.0.14
 *
 * Deux causes, et il faut les deux :
 *
 * 1. **Un `node_modules` périmé.** La déclaration peut être juste et l'installation
 *    en retard — c'est ce qui arrive quand `npm install` échoue à moitié, ou qu'on
 *    change de branche sans réinstaller.
 * 2. **La liste de référence bouge avec `expo` lui-même.** `bundledNativeModules`
 *    est livré *dans* le paquet `expo` : mettre à jour `expo` change ce qu'il
 *    attend des autres. Comparer les déclarations à la liste d'une version d'`expo`
 *    plus ancienne que celle installée ne prouve rien.
 *
 * On compare donc aussi, pour chaque dépendance, la version **installée** à la
 * plage déclarée.
 */

/** Vrai si `version` tombe dans la plage `~x.y.z` ou `^x.y.z`. Sans dépendance. */
function versionSatisfait(version, plage) {
  const m = plage.match(/^([~^]?)(\d+)\.(\d+)\.(\d+)/);
  if (!m) return true; // plage exotique (« * », une URL…) : hors de portée de ce contrôle
  const [, operateur, maj, min, cor] = m;
  const v = version.split('.').map(Number);
  const attendu = [Number(maj), Number(min), Number(cor)];
  if (v.some(Number.isNaN)) return true;

  if (operateur === '~') {
    // ~x.y.z : même majeure, même mineure, correctif au moins égal.
    return v[0] === attendu[0] && v[1] === attendu[1] && v[2] >= attendu[2];
  }
  if (operateur === '^') {
    // ^x.y.z : même majeure, et au moins x.y.z.
    if (v[0] !== attendu[0]) return false;
    return v[1] > attendu[1] || (v[1] === attendu[1] && v[2] >= attendu[2]);
  }
  return version === `${maj}.${min}.${cor}`;
}

const declarations = { ...paquet.dependencies, ...paquet.devDependencies };
for (const [nom, plage] of Object.entries(declarations)) {
  let installe;
  try {
    installe = require(`${nom}/package.json`).version;
  } catch {
    continue; // paquet sans point d'entrée lisible : on ne conclut pas
  }
  if (!versionSatisfait(installe, plage)) {
    problemes.push(
      `${nom} : ${installe} est installé, mais « ${plage} » est déclaré.\n` +
        `      Le dossier node_modules est en retard sur package.json.\n` +
        `      Corriger : npm install`,
    );
  }
}

/* ── Verdict ────────────────────────────────────────────────────────────────── */

if (problemes.length === 0) {
  console.log(`  ok    versions cohérentes avec le SDK Expo ${sdk}`);
  process.exit(0);
}

console.error(`\nIncohérences de version avec le SDK Expo ${sdk} :\n`);
for (const p of problemes) console.error(`  - ${p}`);
console.error(
  '\nCes écarts ne se voient ni dans les types ni dans les tests : ils se manifestent\n' +
    "sur l'appareil, souvent par un refus de démarrer. À corriger avant toute\n" +
    'construction destinée à un téléphone.\n',
);
process.exit(1);

/**
 * Test de fumée — l'application se charge-t-elle vraiment ?
 *
 * `npx expo export` prouve que le bundle **se produit**. Il ne prouve pas qu'il
 * **s'exécute** : une erreur au premier rendu, un import circulaire, une variable
 * lue dans sa zone morte passent la compilation et donnent un écran blanc au
 * lancement. C'est la panne la plus embarrassante qui soit — l'application ne
 * s'ouvre pas du tout — et aucun des 119 contrôles de `npm test` ne la voit,
 * puisqu'ils portent sur les règles de calcul, pas sur le rendu.
 *
 * Ce test comble ce trou : il sert le site exporté, l'ouvre dans un vrai
 * navigateur, attend la fin de l'animation de lancement, et vérifie que les écrans
 * s'affichent — en relevant au passage toute erreur de console et toute exception.
 *
 *     npm run fumee
 *
 * Playwright n'est pas une dépendance du projet : c'est un outil lourd, inutile
 * pour développer. S'il est absent, ce test le dit et s'arrête sans échouer.
 * Pour l'installer une fois :
 *
 *     npm i -D playwright && npx playwright install chromium
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const RACINE = resolve(process.argv[2] ?? 'dist');
const PORT = Number(process.env.PORT_FUMEE ?? 8099);

if (!existsSync(join(RACINE, 'index.html'))) {
  console.log(`Aucun export trouvé dans ${RACINE}.`);
  console.log('Lancez d\'abord :  npx expo export --platform web --output-dir dist');
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('Playwright absent — test de fumée ignoré.');
  console.log('Pour l\'activer :  npm i -D playwright && npx playwright install chromium');
  process.exit(0);
}

/* ── Un serveur statique minimal, qui retombe sur index.html ─────────────── */

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

const serveur = createServer(async (requete, reponse) => {
  const chemin = decodeURIComponent((requete.url ?? '/').split('?')[0] ?? '/');
  // expo-router produit un site à routes : tout chemin inconnu retombe sur la page
  // d'entrée, comme le ferait l'hébergeur.
  const candidats = [
    join(RACINE, chemin),
    join(RACINE, chemin, 'index.html'),
    join(RACINE, `${chemin}.html`),
    join(RACINE, 'index.html'),
  ];
  for (const candidat of candidats) {
    try {
      const contenu = await readFile(candidat);
      reponse.writeHead(200, {
        'Content-Type': TYPES[extname(candidat)] ?? 'application/octet-stream',
      });
      reponse.end(contenu);
      return;
    } catch {
      /* candidat suivant */
    }
  }
  reponse.writeHead(404).end('introuvable');
});

await new Promise((r) => serveur.listen(PORT, r));

/* ── Le navigateur ───────────────────────────────────────────────────────── */

const executablePath = process.env.PLAYWRIGHT_CHROMIUM;
const navigateur = await chromium.launch(executablePath ? { executablePath } : {});
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });

const erreurs = [];
page.on('console', (message) => {
  if (message.type() === 'error') erreurs.push(`console — ${message.text()}`);
});
page.on('pageerror', (e) => erreurs.push(`exception — ${e.message}`));

let echecs = 0;

async function visiter(route, attendus, capture) {
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle' });
  // L'animation de lancement dure environ 2,4 s ; on lui laisse de la marge.
  await page.waitForTimeout(5000);
  if (capture) await page.screenshot({ path: join(RACINE, capture) });
  const texte = await page.innerText('body');
  const manquants = attendus.filter((mot) => !texte.includes(mot));

  if (manquants.length === 0) {
    console.log(`  ok    ${route}`);
    return;
  }
  echecs += 1;
  console.log(`  ÉCHEC ${route}\n        introuvable : ${manquants.join(' · ')}`);
  console.log(`        vu : ${texte.slice(0, 300).replace(/\s+/g, ' ')}`);
}

console.log('\nTest de fumée — l’application se charge et s’affiche\n');

// Sans compte enregistré, l'application doit ouvrir sur l'accueil d'inscription.
await visiter('/', ['SARAMAYA TRANSPORT', 'Créer mon compte'], 'fumee-accueil.png');

// La politique de confidentialité doit répondre à son adresse directe : c'est
// celle qu'on déclare à l'App Store et à Google Play, et un lien mort y est un
// motif de refus. Les titres de section sont affichés en capitales.
await visiter(
  '/confidentialite',
  ['EN UNE PHRASE', "n'a pas de serveur", 'Conditions'],
  'fumee-confidentialite.png',
);

await navigateur.close();
serveur.close();

if (erreurs.length > 0) {
  console.log(`\n${erreurs.length} erreur(s) relevée(s) :`);
  for (const e of new Set(erreurs)) console.log(`   ${e.slice(0, 300)}`);
} else {
  console.log('\naucune erreur de console, aucune exception');
}

console.log(
  echecs === 0 && erreurs.length === 0
    ? '\nL’application se charge et s’affiche correctement.\n'
    : '\nL’application ne se charge pas correctement.\n',
);

process.exit(echecs === 0 && erreurs.length === 0 ? 0 : 1);

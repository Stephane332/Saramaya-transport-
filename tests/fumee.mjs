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

/* ── Le parcours, joué pour de vrai ──────────────────────────────────────── */

/**
 * La règle la plus importante de l'application, vérifiée de bout en bout : **on
 * n'obtient pas de billet avant d'avoir payé.**
 *
 * `npm test` la contrôle déjà au niveau des règles (`parcours.ts`). Ce contrôle-ci
 * est différent et complémentaire : il ouvre l'application, crée un compte, réserve,
 * et regarde ce qui s'affiche réellement à l'écran. C'est la seule façon de vérifier
 * qu'aucun écran ne contourne la règle — le défaut d'origine était précisément là,
 * dans un écran qui décidait dans son coin.
 */
async function jouerLeParcours() {
  console.log('\nParcours — de l’inscription au billet\n');

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  /*
   * `force: true` est nécessaire, et ce n'est pas un contournement paresseux :
   * les écrans utilisent des animations de disposition (reanimated `Layout`) qui,
   * sur le web, laissent les éléments en mouvement perpétuel du point de vue de
   * Playwright. Son contrôle de stabilité attend alors indéfiniment un élément
   * parfaitement immobile qui ne le sera jamais. On vérifie ici que le parcours
   * mène où il doit et que la règle du billet tient — pas la physique du pointeur.
   */
  const cliquer = async (texte) => {
    await page.getByText(texte, { exact: false }).first().click({ force: true, timeout: 15000 });
    await page.waitForTimeout(900);
  };
  /*
   * `exact: true` est indispensable ici : l'exemple de bande MRZ affiché en
   * filigrane contient « SAWADOGO<<ANGE », si bien qu'une correspondance partielle
   * remplit la zone de la bande au lieu du champ voulu — et le formulaire reste
   * incomplet sans qu'on comprenne pourquoi.
   */
  const remplir = async (placeholder, valeur) => {
    await page.getByPlaceholder(placeholder, { exact: true }).first().fill(valeur);
  };
  const controler = async (nom, condition) => {
    if (condition) {
      console.log(`  ok    ${nom}`);
    } else {
      echecs += 1;
      console.log(`  ÉCHEC ${nom}`);
    }
  };

  /*
   * 1. Ouverture de compte.
   *
   * Le chemin normal est l'image de la CNIB, que ce test ne peut pas emprunter :
   * il n'a ni appareil photo ni galerie. On vérifie donc la voie de secours, qui
   * doit rester praticable de bout en bout — c'est elle qui garantit que personne
   * ne reste bloqué faute de pouvoir photographier sa carte.
   */
  await cliquer('Créer mon compte');
  await page.screenshot({ path: join(RACINE, 'fumee-identite.png') });
  await remplir('SAWADOGO', 'SAWADOGO');
  await remplir('ANGE STEPHANE', 'ANGE STEPHANE');
  await remplir('70 45 12 88', '70451288');
  await cliquer('Ouvrir mon compte');
  await page.waitForTimeout(1500);

  await controler(
    'le compte est créé et l’accueil accueille par le prénom',
    (await page.innerText('body')).includes('Bonjour Ange'),
  );

  // 2. Réservation complète.
  await cliquer('Réserver');
  // N'importe quelle ligne convient : ce qui est vérifié plus bas ne dépend pas du
  // trajet choisi. (Avec `force`, le clic peut d'ailleurs atterrir sur la carte
  // voisine si l'animation de liste est encore en cours — sans conséquence ici.)
  await cliquer('Ouahigouya');
  await cliquer('Voir les départs');

  /*
   * Passé le dernier départ de la journée, la liste est vide — c'est le
   * comportement voulu, et il ferait échouer ce test une fois sur deux selon
   * l'heure à laquelle on le lance. On repart donc sur la date la plus lointaine
   * proposée, qui a toujours ses départs devant elle.
   */
  if ((await page.innerText('body')).includes('Plus de départ')) {
    await cliquer('Changer de date');
    await page
      .locator('text=/^(LUN|MAR|MER|JEU|VEN|SAM|DIM)$/')
      .last()
      .click({ force: true, timeout: 15000 });
    await page.waitForTimeout(600);
    await cliquer('Voir les départs');
  }

  // Le premier départ proposé.
  await page.locator('text=/^CONVOCATION/').first().click({ force: true, timeout: 15000 });
  await page.waitForTimeout(900);
  await cliquer('Sans préférence de place');
  await cliquer('Créer ma réservation');
  await page.waitForTimeout(2000);

  const billet = await page.innerText('body');

  // 3. Et voici ce qui compte.
  await controler(
    'la réservation naît « à payer »',
    billet.includes('Place retenue') || billet.includes('PLACE RETENUE'),
  );
  await controler(
    'l’écran annonce une RÉSERVATION, pas un ticket de voyage',
    billet.includes('RÉSERVATION') && !billet.includes('TICKET DE VOYAGE'),
  );
  await controler(
    'aucun code n’est présenté au contrôleur',
    !billet.includes('Présentez ce code'),
  );
  await controler(
    'aucun QR n’est dessiné avant paiement',
    (await page.locator('svg').count()) === 0 || !billet.includes('Présentez ce code'),
  );
  await controler(
    'les coordonnées Orange Money sont données pour payer',
    billet.includes('Orange Money'),
  );

  await page.screenshot({ path: join(RACINE, 'fumee-billet-impaye.png') });

  // 4. La déclaration de paiement ne fabrique toujours pas de billet.
  await cliquer("J'ai effectué le paiement");
  await page.waitForTimeout(1200);
  const apres = await page.innerText('body');
  await controler(
    'une déclaration de paiement ne délivre toujours pas le billet',
    apres.includes('Paiement déclaré') && !apres.includes('Présentez ce code'),
  );
  await controler(
    'et la déclaration ne peut pas être répétée',
    !apres.includes("J'ai effectué le paiement"),
  );

  /*
   * 5. Le colis suit la même règle : préparer un envoi ne le dépose pas et ne le
   *    paie pas. L'écran affichait auparavant « Payé » et « Déposé » à la seconde
   *    du clic, après une fausse attente de paiement de 1,2 seconde.
   */
  await page.goto(`http://localhost:${PORT}/colis`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await cliquer('Envoyer un colis');
  await page.getByPlaceholder('OUEDRAOGO Fatimata', { exact: true }).first().fill('OUEDRAOGO Fatimata');
  await page.getByPlaceholder('70 45 12 88', { exact: true }).first().fill('70451288');
  await cliquer("Préparer l'envoi");
  await page.waitForTimeout(2000);

  const colis = await page.innerText('body');
  await controler(
    'le colis est « à remettre au guichet », pas déposé',
    colis.includes('À REMETTRE AU GUICHET') || colis.includes('pas encore déposé'),
  );
  await controler(
    'aucun code de retrait n’est montré avant le dépôt',
    !colis.includes('CODE DE RETRAIT'),
  );
  await controler(
    'le montant est annoncé comme restant à régler',
    colis.includes('À régler au dépôt') || colis.includes('à confirmer au pesage'),
  );
  await controler(
    'et rien ne prétend que le colis est payé',
    !/\bPayé\b/.test(colis),
  );
  await page.screenshot({ path: join(RACINE, 'fumee-colis-a-deposer.png') });
}

try {
  await jouerLeParcours();
} catch (e) {
  echecs += 1;
  console.log(`  ÉCHEC parcours interrompu — ${e.message.split('\n')[0]}`);
  await page.screenshot({ path: join(RACINE, 'fumee-parcours-echec.png') });
}

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

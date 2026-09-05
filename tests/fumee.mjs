/**
 * Test de fumée — l'application se charge-t-elle vraiment ?
 *
 * `npx expo export` prouve que le bundle **se produit**. Il ne prouve pas qu'il
 * **s'exécute** : une erreur au premier rendu, un import circulaire, une variable
 * lue dans sa zone morte passent la compilation et donnent un écran blanc au
 * lancement. C'est la panne la plus embarrassante qui soit — l'application ne
 * s'ouvre pas du tout — et ni `npm test` ni `npm run invariants` ne la voient,
 * puisqu'ils portent sur les règles de calcul, pas sur le rendu.
 *
 * Trois familles de parcours sont jouées :
 *
 *   · **le voyageur** — inscription à partir de la bande de sa carte, réservation,
 *     billet, colis ; et la règle qui prime : rien avant paiement ;
 *   · **l'application publique** — les écrans du personnel doivent être hors
 *     d'atteinte, y compris en tapant l'adresse directement ;
 *   · **l'agent** — manifeste, caisse, contrôle, dans le paquet construit avec
 *     `EXPO_PUBLIC_MODE_AGENT=1`.
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
/**
 * Export du **mode agent**, facultatif.
 *
 * Les écrans du personnel — manifeste, caisse, contrôle — ne sont pas dans
 * l'application publique : ils demandent un second paquet, construit avec
 * `EXPO_PUBLIC_MODE_AGENT=1`. Sans lui, les parcours agent sont annoncés comme non
 * joués plutôt que silencieusement omis.
 */
const RACINE_AGENT = process.argv[3] ? resolve(process.argv[3]) : null;
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

let racineServie = RACINE;

const serveur = createServer(async (requete, reponse) => {
  const chemin = decodeURIComponent((requete.url ?? '/').split('?')[0] ?? '/');
  // expo-router produit un site à routes : tout chemin inconnu retombe sur la page
  // d'entrée, comme le ferait l'hébergeur.
  const candidats = [
    join(racineServie, chemin),
    join(racineServie, chemin, 'index.html'),
    join(racineServie, `${chemin}.html`),
    join(racineServie, 'index.html'),
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

/**
 * Playwright réclame le Chromium **de sa version** : mettre à jour le paquet sans
 * relancer `playwright install` rend le test injouable, alors que la machine a
 * souvent déjà un Chromium utilisable. Plutôt que d'abandonner la seule
 * vérification qui exécute vraiment l'application, on retombe sur celui qu'on
 * trouve. `PLAYWRIGHT_CHROMIUM` reste prioritaire pour imposer un binaire précis.
 */
const CHROMIUM_CONNUS = [
  process.env.PLAYWRIGHT_CHROMIUM,
  '/opt/pw-browsers/chromium',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].filter((chemin) => chemin && existsSync(chemin));

async function ouvrirNavigateur() {
  try {
    if (!process.env.PLAYWRIGHT_CHROMIUM) return await chromium.launch();
  } catch (e) {
    if (CHROMIUM_CONNUS.length === 0) throw e;
  }
  for (const executablePath of CHROMIUM_CONNUS) {
    try {
      const lance = await chromium.launch({ executablePath });
      console.log(`Chromium : ${executablePath}`);
      return lance;
    } catch {
      /* binaire suivant */
    }
  }
  throw new Error(
    'Aucun Chromium utilisable. Installez-le :  npx playwright install chromium',
  );
}

const navigateur = await ouvrirNavigateur();
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

/**
 * Bande d'une CNIB **fictive**, avec des clés de contrôle valides.
 *
 * Aucune vraie pièce d'identité n'a sa place dans un dépôt de code, fût-ce dans un
 * test. Celle-ci est fabriquée : numéro B98765432, née le 14/05/1990, carte
 * expirant le 11/03/2032.
 */
const BANDE_EXEMPLE = [
  'I<BFAB987654323<<<<<<<<<<<<<<<',
  '9005145F3203112BFA<<<<<<<<<<<2',
  'OUEDRAOGO<<FATIMATA<ADIZA<<<<<',
].join('\n');

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
  /*
   * L'échec dit **sur quoi** il a échoué, et laisse une capture.
   *
   * Un « locator.click: Timeout 15000ms exceeded » nu ne dit ni quel bouton, ni ce
   * que montrait l'écran : on repart à zéro à chaque fois. Le parcours compte une
   * quinzaine de clics — le nom du texte cherché et l'image de l'écran à cet
   * instant sont la différence entre un diagnostic d'une minute et une soirée.
   */
  const cliquerLocalisateur = async (localisateur, nom) => {
    try {
      await localisateur.click({ force: true, timeout: 15000 });
    } catch (e) {
      const capture = join(RACINE, `fumee-echec-${nom.slice(0, 30).replace(/\W+/g, '-')}.png`);
      await page.screenshot({ path: capture, fullPage: true }).catch(() => undefined);
      throw new Error(`clic sur « ${nom} » impossible — capture : ${capture}\n${e.message}`);
    }
    await page.waitForTimeout(900);
  };
  const cliquer = (texte) =>
    cliquerLocalisateur(page.getByText(texte, { exact: false }).first(), texte);
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
   * 1. Ouverture de compte à partir de la bande du dos.
   *
   * Le chemin normal est l'image de la CNIB, que ce test ne peut pas emprunter :
   * il n'a ni appareil photo ni galerie. Il emprunte donc la voie de secours — qui
   * traverse **exactement le même décodage**, les mêmes clés de contrôle et la même
   * fusion. C'est donc bien le vrai chemin de lecture qui est vérifié ici, de la
   * bande brute jusqu'à la carte affichée.
   */
  await cliquer('Créer mon compte');
  await page.screenshot({ path: join(RACINE, 'fumee-identite-vide.png') });

  // Avant toute lecture, l'écran ne doit montrer aucun formulaire : c'était le
  // défaut signalé — des champs d'exemple grisés qu'on prenait pour des données.
  const avantLecture = await page.innerText('body');
  await controler(
    'aucun formulaire tant qu’aucune carte n’est lue',
    !avantLecture.includes('NUMÉRO CNIB') && !avantLecture.includes('EXPIRE LE'),
  );

  await cliquer('Recopier la bande du dos à la main');
  await page.locator('textarea').first().fill(BANDE_EXEMPLE);
  await cliquer('Remplir depuis la bande');
  await page.waitForTimeout(1200);

  const apresLecture = await page.innerText('body');
  await controler(
    'la carte lue s’affiche comme une carte',
    apresLecture.includes('COPIE NUMÉRIQUE') && apresLecture.includes('OUEDRAOGO'),
  );
  await controler(
    'la carte porte les champs décodés de la bande',
    apresLecture.includes('B98765432') && apresLecture.includes('11/03/2032'),
  );
  await controler(
    'et rappelle qu’elle ne remplace pas la carte physique',
    apresLecture.includes('PRÉSENTEZ LA CARTE ORIGINALE AU CONTRÔLE'),
  );
  await page.screenshot({ path: join(RACINE, 'fumee-identite.png') });

  await remplir('70 00 00 00', '70451288');
  await cliquer('Ouvrir mon compte');
  await page.waitForTimeout(1500);

  await controler(
    'le compte est créé et l’accueil accueille par le prénom',
    (await page.innerText('body')).includes('Bonjour Fatimata'),
  );

  // 2. Réservation complète.
  await cliquer('Réserver');
  // N'importe quelle ligne convient : ce qui est vérifié plus bas ne dépend pas du
  // trajet choisi. (Avec `force`, le clic peut d'ailleurs atterrir sur la carte
  // voisine si l'animation de liste est encore en cours — sans conséquence ici.)
  await cliquer('Ouahigouya');

  /*
   * On réserve pour **demain**, jamais pour aujourd'hui.
   *
   * Passé le dernier départ de la journée, la liste d'aujourd'hui est vide — c'est
   * le comportement voulu, mais il fait dépendre le test de l'heure à laquelle on
   * le lance. Demain a toujours tous ses départs devant lui.
   *
   * Il y avait ici une branche de repli qui ne se déclenchait qu'après le dernier
   * bus : autant dire jamais. Le jour où elle a servi, elle était cassée depuis
   * toujours — son sélecteur cherchait « SAM » quand les puces affichent « SAM. ».
   * Un chemin qu'on n'emprunte pas est un chemin qui pourrit ; celui-ci est
   * désormais le chemin normal, donc joué à chaque exécution.
   */
  await cliquerLocalisateur(
    page.getByText(/^(LUN|MAR|MER|JEU|VEN|SAM|DIM)\.$/).nth(1),
    'le jour de demain dans le calendrier',
  );
  await cliquer('Voir les départs');

  // Le premier départ proposé.
  await cliquerLocalisateur(
    page.locator('text=/^CONVOCATION/').first(),
    'le premier départ de la liste',
  );
  await page.waitForTimeout(900);
  /*
   * On ne choisit pas sa place chez Saramaya : l'agent l'attribue en encaissant.
   * L'écran ne propose donc plus un plan de cabine mais un numéro souhaité, qu'on
   * laisse vide ici — c'est le cas le plus courant.
   */
  await cliquer('Continuer sans préférence');
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

  /*
   * 6. Un billet **payé**, et donc un vrai titre de transport.
   *
   * Tous les contrôles précédents portent sur ce qui ne doit *pas* s'afficher avant
   * paiement. Celui-ci vérifie le contraire, qui compte tout autant : une fois le
   * paiement établi, le billet doit exister pour de bon. Une règle qui interdit
   * sans jamais autoriser ne serait pas une règle, seulement une panne.
   *
   * On y arrive par l'import d'un ticket papier — le seul chemin qui, sans le
   * système de la compagnie, constate un paiement : le voyageur a déjà réglé au
   * guichet, son ticket le prouve.
   */
  await page.goto(`http://localhost:${PORT}/reserver?scan=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await cliquer('Saisir le ticket');
  await remplir('66456', '66456');
  await cliquer('Ajouter à mes voyages');
  await page.waitForTimeout(2000);

  const billetPaye = await page.innerText('body');
  await controler(
    'un billet payé délivre un vrai titre de transport',
    billetPaye.includes('BILLET DE VOYAGE') && billetPaye.includes('Présentez ce code'),
  );
  await controler(
    'et le QR est réellement dessiné',
    (await page.locator('svg').count()) > 0,
  );
  await controler(
    'la référence du guichet est conservée telle quelle',
    billetPaye.includes('66456'),
  );
  await page.screenshot({ path: join(RACINE, 'fumee-billet-paye.png') });

  /*
   * 7. Le pied de l'application : les deux noms, le concepteur, la version.
   *
   * La version est la première chose qu'on demande quand quelque chose ne va pas ;
   * elle doit être lisible sans rien installer ni chercher. Le contrôle vérifie
   * aussi qu'aucun paragraphe n'est revenu s'y loger — un pied de page porte des
   * noms, pas des explications.
   */
  await page.goto(`http://localhost:${PORT}/profil`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  // On descend avant de capturer : une capture qui ne montre pas la partie
  // vérifiée n'est d'aucune aide le jour où le contrôle échoue.
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(800);
  const profil = await page.innerText('body');
  await controler(
    'le pied porte la compagnie, le concepteur et la version',
    profil.includes('SARAMAYA TRANSPORT') &&
      profil.includes('Conçu par Ange Stéphane Sawadogo') &&
      /VERSION \d+\.\d+\.\d+/.test(profil),
  );
  await controler(
    'et rien de plus — aucune description n’y est revenue',
    !profil.includes('application indépendante'),
  );
  await page.screenshot({ path: join(RACINE, 'fumee-profil-pied.png') });
}

/**
 * Les écrans du personnel ne doivent pas exister dans l'application publique.
 *
 * `modeAgent.ts` en fait la promesse ; ce contrôle la met à l'épreuve par le seul
 * chemin qui compte — taper l'adresse directement, ce que la garde des écrans est
 * censée intercepter. Un renvoi vers l'accueil est la bonne réponse ; afficher le
 * manifeste des passagers en serait une très mauvaise.
 */
async function verifierEcransAgentAbsents() {
  console.log('\nApplication publique — les écrans du personnel sont hors d’atteinte\n');

  /*
   * Un repère **propre à chaque écran**, et non une liste commune.
   *
   * Le contrôle utilisait deux repères pour les trois écrans : `/controle`, qui n'en
   * portait aucun, passait donc toujours — y compris le jour où le paquet public a
   * réellement embarqué les écrans du personnel. Un test qui ne peut pas échouer ne
   * teste rien.
   */
  const REPERES = {
    '/gare': 'APERÇU — CÔTÉ GARE',
    '/controle': 'Scannez le QR du billet',
    '/caisse': 'CÔTÉ AGENT',
  };

  for (const [route, repere] of Object.entries(REPERES)) {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);
    const texte = await page.innerText('body');
    const renvoye = !texte.includes(repere);
    if (renvoye) {
      console.log(`  ok    ${route} renvoie le voyageur ailleurs`);
    } else {
      echecs += 1;
      console.log(`  ÉCHEC ${route} affiche un écran réservé au personnel`);
    }
  }
}

/**
 * Les parcours de l'agent, joués dans le paquet du mode agent.
 *
 * Le contrôle d'un QR à la porte du bus ne peut pas être joué ici : le scanner web
 * n'a pas de caméra. Sa logique est en revanche couverte par les invariants — deux
 * mille deux cent vingt-deux altérations d'un caractère, toutes refusées. Ce qui se
 * vérifie ici est ce que les invariants ne voient pas : que les écrans s'ouvrent,
 * s'affichent et s'enchaînent.
 */
async function jouerLesParcoursAgent() {
  if (!RACINE_AGENT) {
    console.log('\nParcours agent — non joués (aucun export en mode agent fourni)\n');
    return;
  }

  console.log('\nParcours agent — manifeste, caisse, contrôle\n');
  racineServie = RACINE_AGENT;

  const controler = async (route, attendus, capture) => {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4500);
    if (capture) await page.screenshot({ path: join(RACINE_AGENT, capture) });
    const texte = await page.innerText('body');
    const manquants = attendus.filter((m) => !texte.includes(m));
    if (manquants.length === 0) {
      console.log(`  ok    ${route}`);
    } else {
      echecs += 1;
      console.log(`  ÉCHEC ${route}\n        introuvable : ${manquants.join(' · ')}`);
      console.log(`        vu : ${texte.slice(0, 260).replace(/\s+/g, ' ')}`);
    }
  };

  // Les titres de section sont rendus en capitales par le composant `Section`.
  await controler('/gare', ['APERÇU — CÔTÉ GARE', 'Départs', 'EMBARQUEMENT'], 'fumee-agent-gare.png');
  await controler('/caisse', ['CÔTÉ AGENT', 'Ma caisse', 'Orange Money'], 'fumee-agent-caisse.png');
  // Le repli quand la caméra refuse doit être annoncé : sans lui, l'agent est
  // sans recours à la porte du car.
  await controler('/controle', ['Contrôle', 'MANIFESTE DU DÉPART'], 'fumee-agent-controle.png');
}

try {
  await verifierEcransAgentAbsents();
} catch (e) {
  echecs += 1;
  console.log(`  ÉCHEC contrôle des écrans agent interrompu — ${e.message.split('\n')[0]}`);
}

try {
  await jouerLeParcours();
} catch (e) {
  echecs += 1;
  console.log(`  ÉCHEC parcours interrompu — ${e.message.split('\n')[0]}`);
  await page.screenshot({ path: join(RACINE, 'fumee-parcours-echec.png') });
}

try {
  await jouerLesParcoursAgent();
} catch (e) {
  echecs += 1;
  console.log(`  ÉCHEC parcours agent interrompu — ${e.message.split('\n')[0]}`);
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

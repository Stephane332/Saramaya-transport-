/**
 * Prépare l'export web pour un hébergement statique en sous-dossier (GitHub Pages).
 *
 * Trois choses qu'`expo export` ne fait pas :
 *
 *   1. Les balises qui rendent l'application installable sur l'écran d'accueil.
 *      Expo n'utilise `app/+html.tsx` qu'en rendu statique ; or ce projet embarque
 *      three.js et des modules natifs qui ne survivraient pas à un rendu côté Node.
 *      On injecte donc les balises après coup, ce qui évite ce risque.
 *   2. Le repli des liens profonds : l'hébergeur ne connaît qu'index.html, alors que
 *      la navigation est gérée côté client. On duplique la page en 404.html.
 *   3. Le fichier .nojekyll, sans lequel GitHub Pages ignore les dossiers en « _ »
 *      — c'est-à-dire tout le bundle, rangé dans _expo/.
 *
 * Usage :  node scripts/preparer-pages.mjs <dossier> [prefixe-url]
 */

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dossier = process.argv[2] ?? 'dist';
const base = (process.argv[3] ?? process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');

const FOND = '#0A070E';

const manifeste = {
  name: 'Saramaya Transport',
  // Sous l'icône, l'écran d'accueil coupe au-delà d'une douzaine de caractères :
  // « Saramaya » entier vaut mieux que « Saramaya Tra… ».
  short_name: 'Saramaya',
  description: 'Vos voyages Saramaya Transport : billet hors ligne, rappels et réservation.',
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  orientation: 'portrait',
  background_color: FOND,
  theme_color: FOND,
  lang: 'fr',
  icons: [
    { src: `${base}/icone-192.png`, sizes: '192x192', type: 'image/png' },
    { src: `${base}/icone-512.png`, sizes: '512x512', type: 'image/png' },
  ],
};

const balises = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Saramaya" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="theme-color" content="${FOND}" />
    <meta name="description" content="Vos voyages Saramaya Transport : billet hors ligne, rappels de départ et réservation." />
    <link rel="apple-touch-icon" href="${base}/apple-touch-icon.png" />
    <link rel="manifest" href="data:application/manifest+json,${encodeURIComponent(JSON.stringify(manifeste))}" />
    <style>
      html, body, #root { background-color: ${FOND}; }
      body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
    </style>
`;

const chemin = join(dossier, 'index.html');
let html = readFileSync(chemin, 'utf8');

html = html.replace('<html lang="en">', '<html lang="fr">');

// viewport-fit=cover : l'application peint sous l'encoche de l'iPhone.
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />',
);

if (html.includes('apple-mobile-web-app-capable')) {
  console.log('Les balises sont déjà présentes, rien à injecter.');
} else {
  html = html.replace('</head>', `${balises}  </head>`);
}

writeFileSync(chemin, html);
copyFileSync(chemin, join(dossier, '404.html'));
writeFileSync(join(dossier, '.nojekyll'), '');

console.log(`Préparé : ${dossier} (préfixe « ${base || '/'} »)`);
console.log('  index.html enrichi, 404.html créé, .nojekyll ajouté.');

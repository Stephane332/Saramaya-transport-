/**
 * Régénère la déclaration de types des routes, avant le contrôle des types.
 *
 * ## Le défaut que ce script corrige
 *
 * `app.json` active `experiments.typedRoutes` : expo-router écrit alors, dans
 * `.expo/types/router.d.ts`, la liste **fermée** des chemins existants, ce qui fait
 * qu'une faute de frappe dans un `router.push('/confidentialté')` devient une erreur
 * de compilation. C'est précieux, et c'est aussi un piège :
 *
 * · ce fichier est **généré**, donc absent du dépôt ;
 * · il n'est régénéré que par `expo start` ou `expo export` ;
 * · quand il **manque**, le type des chemins retombe sur `string` et tout passe ;
 * · quand il est **périmé**, une route ajoutée depuis est refusée.
 *
 * Autrement dit, `npx tsc --noEmit` ne donnait pas le même verdict sur deux machines
 * selon ce qu'elles avaient lancé auparavant. Une nouvelle route ajoutée ici passait
 * les contrôles — le fichier étant absent — et faisait échouer la vérification chez
 * quelqu'un qui avait ouvert l'application une fois. C'est exactement le genre
 * d'écart qui fait douter de la chaîne de vérification elle-même.
 *
 * On régénère donc systématiquement avant de vérifier, pour que le contrôle porte
 * toujours sur l'état réel des routes.
 *
 * ## Pourquoi ne pas simplement lancer `expo export`
 *
 * Parce qu'il faut deux minutes et un bundle complet pour produire un fichier que
 * cette fonction écrit en quelques millisecondes. La régénération est appelée
 * directement, telle que `@expo/cli` l'appelle lui-même.
 */

import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const racine = process.cwd();
const dossierApp = path.join(racine, 'app');
const dossierTypes = path.join(racine, '.expo', 'types');

if (!existsSync(dossierApp)) {
  console.error("  ÉCHEC : dossier « app » introuvable — lancez la commande à la racine du projet.");
  process.exit(1);
}

// La fonction de génération lit cette variable pour savoir où sont les écrans.
process.env.EXPO_ROUTER_APP_ROOT = dossierApp;

mkdirSync(dossierTypes, { recursive: true });

try {
  const { regenerateDeclarations } = await import('expo-router/build/typed-routes/index.js');

  /*
   * `regenerateDeclarations` est temporisée : conçue pour un observateur de
   * fichiers, elle attend une seconde d'inactivité avant d'écrire. On la déclenche,
   * puis on patiente le temps qu'elle s'exécute — sans quoi le processus se
   * terminerait avant l'écriture, et le contrôle des types repartirait sur
   * l'ancien fichier.
   */
  regenerateDeclarations(dossierTypes);
  await new Promise((r) => setTimeout(r, 1500));

  const fichier = path.join(dossierTypes, 'router.d.ts');
  if (!existsSync(fichier)) {
    console.error('  ÉCHEC : les types de routes n’ont pas été écrits.');
    process.exit(1);
  }
  console.log('  ok    types des routes régénérés');
} catch (erreur) {
  console.error(`  ÉCHEC : régénération impossible — ${erreur?.message ?? erreur}`);
  process.exit(1);
}

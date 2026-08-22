/**
 * `import.meta` dans les dépendances.
 *
 * Zustand embarque un module de débogage qui interroge `import.meta.env.MODE` pour
 * savoir s'il tourne en développement. Nous ne nous en servons pas — seul `persist`
 * est utilisé — mais il arrive quand même dans le paquet, et `import.meta` n'est
 * valide que dans un module ES. Servi en script classique, le navigateur s'arrête
 * sur « Cannot use 'import.meta' outside a module » et l'écran reste vide ; côté
 * appareil, Hermes ne le comprend pas davantage.
 *
 * On remplace donc l'expression, à la construction, par la seule information qu'elle
 * cherchait : le mode courant. Le module de débogage voit ce qu'il attend, et plus
 * rien d'invalide ne subsiste dans le paquet.
 *
 * Ce greffon est écrit ici plutôt qu'ajouté en dépendance : il tient en cinq lignes,
 * et une dépendance de plus serait une chose de plus à garder alignée sur le SDK —
 * précisément le genre d'écart qui a déjà coûté cher sur ce projet.
 */
const remplacerImportMeta = () => ({
  visitor: {
    MetaProperty(chemin) {
      // `MetaProperty` couvre aussi `new.target` : on ne touche qu'à `import.meta`.
      if (chemin.node.meta?.name !== 'import') return;
      chemin.replaceWithSourceString('({ env: { MODE: process.env.NODE_ENV } })');
    },
  },
});

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      remplacerImportMeta,
      // Doit rester en dernier : Reanimated 4 s'appuie sur react-native-worklets.
      'react-native-worklets/plugin',
    ],
  };
};

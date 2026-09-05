/**
 * Complète app.json au moment du build.
 *
 * GitHub Pages sert le site depuis un sous-dossier (/Saramaya-transport-/) et non
 * depuis la racine du domaine. Sans `baseUrl`, l'export Expo génère des chemins
 * absolus vers /_expo/... qui n'existent pas à cet endroit, et la page reste blanche.
 *
 * La variable n'est définie que dans le workflow de publication : en local,
 * `expo start` et `expo export` continuent de fonctionner à la racine.
 */

module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;

  return {
    ...config,
    experiments: {
      ...config.experiments,
      ...(baseUrl ? { baseUrl } : {}),
    },
  };
};

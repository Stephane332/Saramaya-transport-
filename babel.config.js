/*
 * Champs privés de classe (`#champ`) et moteur Hermes d'Expo Go.
 *
 * Le Hermes embarqué dans Expo Go refuse cette syntaxe : la compilation s'arrête
 * sur « private properties are not supported » et l'application ne démarre pas du
 * tout sur l'appareil. React Native s'en sert dans ses propres classes internes
 * (react-native/src/private/webapis/geometry/DOMRectReadOnly.js), il ne suffit donc
 * pas de l'éviter dans notre code : il faut la traduire à la construction.
 *
 * Les transformations sont placées dans un préréglage, et non dans `plugins` :
 * Babel exécute tous les greffons avant tous les préréglages, si bien qu'un greffon
 * de premier niveau verrait le TypeScript et le Flow avant qu'ils soient retirés, et
 * échouerait sur `declare class`. Les préréglages, eux, s'appliquent en ordre
 * inverse — celui-ci vient donc après `babel-preset-expo`, sur du JavaScript déjà
 * débarrassé de ses annotations de types.
 */
const traduireChampsPrives = () => ({
  plugins: [
    ['@babel/plugin-transform-class-properties', { loose: true }],
    ['@babel/plugin-transform-private-methods', { loose: true }],
    ['@babel/plugin-transform-private-property-in-object', { loose: true }],
  ],
});

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [traduireChampsPrives, 'babel-preset-expo'],
    // Doit rester en dernier : Reanimated 4 s'appuie sur react-native-worklets.
    plugins: ['react-native-worklets/plugin'],
  };
};

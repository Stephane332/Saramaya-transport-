module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Doit rester en dernier : Reanimated 4 s'appuie sur react-native-worklets.
    plugins: ['react-native-worklets/plugin'],
  };
};

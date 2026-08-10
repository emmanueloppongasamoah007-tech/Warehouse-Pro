module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // `jsxImportSource` routes JSX through NativeWind's runtime so `className`
      // is understood. Reanimated/worklets is handled by nativewind/babel below,
      // so it is disabled here to avoid registering the plugin twice.
      ['babel-preset-expo', { jsxImportSource: 'nativewind', reanimated: false }],
      'nativewind/babel',
    ],
  };
};

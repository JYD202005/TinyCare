module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-proposal-decorators', { legacy: true }],
    ],
    overrides: [
      {
        exclude: /node_modules/,
        plugins: [['@babel/plugin-proposal-class-properties', { loose: true }]],
      },
    ],
  };
};

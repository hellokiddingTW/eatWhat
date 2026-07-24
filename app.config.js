module.exports = ({ config }) => {
  return {
    ...config,
    ios: {
      ...config.ios,
      bundleIdentifier: 'com.nateyeh.eatwhat',
    },
    android: {
      ...config.android,
      package: 'com.nateyeh.eatwhat',
    },
    plugins: [...(config.plugins ?? []), './plugins/withGoogleMaps'],
  };
};

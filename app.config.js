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
    plugins: [
      ...(config.plugins ?? []),
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            '允許 EatWhat 使用你的位置，以尋找附近仍在營業的餐廳。',
        },
      ],
      './plugins/withGoogleMaps',
    ],
  };
};

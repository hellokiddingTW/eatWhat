const { withDangerousMod } = require('@expo/config-plugins');
const withMaps = require('react-native-maps/app.plugin.js').default;

const getGoogleMapsPluginOptions = (environment) => {
  return {
    androidGoogleMapsApiKey: environment.GOOGLE_MAPS_ANDROID_API_KEY,
    iosGoogleMapsApiKey: environment.GOOGLE_MAPS_IOS_API_KEY,
  };
};

const requireGoogleMapsApiKey = (environment, platform) => {
  const variableName =
    platform === 'android' ? 'GOOGLE_MAPS_ANDROID_API_KEY' : 'GOOGLE_MAPS_IOS_API_KEY';
  const apiKey = environment[variableName];

  if (!apiKey) {
    throw new Error(`Native Google Maps ${platform} builds require ${variableName}.`);
  }

  return apiKey;
};

const withKeyValidation = (config, platform) =>
  withDangerousMod(config, [
    platform,
    async (modConfig) => {
      requireGoogleMapsApiKey(process.env, platform);
      return modConfig;
    },
  ]);

const withGoogleMaps = (config) => {
  const configured = withMaps(config, getGoogleMapsPluginOptions(process.env));
  const withIosValidation = withKeyValidation(configured, 'ios');
  return withKeyValidation(withIosValidation, 'android');
};

module.exports = withGoogleMaps;
module.exports.getGoogleMapsPluginOptions = getGoogleMapsPluginOptions;
module.exports.requireGoogleMapsApiKey = requireGoogleMapsApiKey;

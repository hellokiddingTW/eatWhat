export const requireGoogleMapsWebApiKey = (value?: string) => {
  const apiKey = value?.trim();

  if (!apiKey) {
    throw new Error('Web Google Maps requires EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY.');
  }

  return apiKey;
};

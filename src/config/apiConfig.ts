export const requireApiBaseUrl = (value?: string) => {
  const candidate = value?.trim();

  if (!candidate) {
    throw new Error('Restaurant search requires EXPO_PUBLIC_API_BASE_URL.');
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be a valid HTTP URL.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be a valid HTTP URL.');
  }

  return candidate.replace(/\/+$/, '');
};

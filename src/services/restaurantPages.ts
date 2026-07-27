import type { Restaurant } from '../types/restaurant';

const MAX_RESTAURANT_PAGES = 3;

export const mergeRestaurantPages = (
  current: Restaurant[],
  incoming: Restaurant[],
) => {
  const seenIds = new Set(current.map(({ id }) => id));
  return [
    ...current,
    ...incoming.filter(({ id }) => {
      if (seenIds.has(id)) {
        return false;
      }

      seenIds.add(id);
      return true;
    }),
  ].sort((a, b) => a.distanceMeters - b.distanceMeters);
};

export const canLoadRestaurantPage = (
  pagesLoaded: number,
  nextPageToken?: string,
) =>
  pagesLoaded < MAX_RESTAURANT_PAGES &&
  Boolean(nextPageToken?.trim());

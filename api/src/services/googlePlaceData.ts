import type {
  NearbyRestaurantQuery,
  Restaurant,
} from '../types/restaurant.js';

const EARTH_RADIUS_METERS = 6_371_000;

export const GOOGLE_PLACE_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.formattedAddress',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.types',
  'places.googleMapsUri',
  'places.currentOpeningHours',
  'places.timeZone',
].join(',');

type GoogleOpeningHours = {
  openNow?: boolean;
  nextCloseTime?: string;
  periods?: {
    open?: {
      day?: number;
      hour?: number;
      minute?: number;
    };
    close?: unknown;
  }[];
};

export type GooglePlace = {
  id?: string;
  displayName?: {
    text?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
  };
  formattedAddress?: string;
  primaryType?: string;
  primaryTypeDisplayName?: {
    text?: string;
  };
  types?: string[];
  googleMapsUri?: string;
  currentOpeningHours?: GoogleOpeningHours;
  timeZone?: {
    id?: string;
  };
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const distanceBetweenMeters = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
) => {
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const originLatitude = toRadians(origin.lat);
  const destinationLatitude = toRadians(destination.lat);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return Math.round(
    2 *
      EARTH_RADIUS_METERS *
      Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)),
  );
};

const buildGoogleMapsUrl = (id: string, name: string) => {
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  url.searchParams.set('query', name);
  url.searchParams.set('query_place_id', id);
  return url.toString();
};

const getClosingTimeText = ({
  currentOpeningHours,
  timeZone,
}: GooglePlace) => {
  const nextCloseTime = currentOpeningHours?.nextCloseTime?.trim();
  const timeZoneId = timeZone?.id?.trim();

  if (nextCloseTime && timeZoneId) {
    const closingDate = new Date(nextCloseTime);

    if (!Number.isNaN(closingDate.getTime())) {
      try {
        const closingTime = new Intl.DateTimeFormat('en-GB', {
          timeZone: timeZoneId,
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(closingDate);

        return `營業到 ${closingTime}`;
      } catch {
        // Ignore malformed time zones from upstream data.
      }
    }
  }

  const isAlwaysOpen = currentOpeningHours?.periods?.some(
    ({ open, close }) =>
      !close &&
      open?.day === 0 &&
      open.hour === 0 &&
      open.minute === 0,
  );

  return isAlwaysOpen ? '24 小時營業' : undefined;
};

const normalizeGooglePlace = (
  place: GooglePlace,
  query: NearbyRestaurantQuery,
): Restaurant | undefined => {
  const id = place.id?.trim();
  const name = place.displayName?.text?.trim();
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;

  if (
    !id ||
    !name ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !place.types?.includes('restaurant') ||
    place.currentOpeningHours?.openNow !== true
  ) {
    return undefined;
  }

  const location = {
    lat: lat as number,
    lng: lng as number,
  };
  const distanceMeters = distanceBetweenMeters(
    { lat: query.lat, lng: query.lng },
    location,
  );

  if (distanceMeters > query.radius) {
    return undefined;
  }

  const address = place.formattedAddress?.trim();
  const cuisineType = place.primaryTypeDisplayName?.text?.trim();
  const googleMapsUrl =
    place.googleMapsUri?.trim() || buildGoogleMapsUrl(id, name);
  const closingTimeText = getClosingTimeText(place);

  return {
    id,
    name,
    distanceMeters,
    isOpenNow: true,
    ...(address ? { address } : {}),
    ...(cuisineType ? { cuisineTypes: [cuisineType] } : {}),
    ...(closingTimeText ? { closingTimeText } : {}),
    location,
    googleMapsUrl,
  };
};

const deduplicateAndSortRestaurants = (restaurants: Restaurant[]) => {
  const seenIds = new Set<string>();

  return restaurants
    .filter(({ id }) => {
      if (seenIds.has(id)) {
        return false;
      }

      seenIds.add(id);
      return true;
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
};

export const normalizeGooglePlaces = (
  places: GooglePlace[],
  query: NearbyRestaurantQuery,
) =>
  deduplicateAndSortRestaurants(
    places
      .map((place) => normalizeGooglePlace(place, query))
      .filter((restaurant): restaurant is Restaurant => Boolean(restaurant)),
  );

export const mergeRestaurantResults = (
  primary: Restaurant[],
  fallback: Restaurant[],
) => deduplicateAndSortRestaurants([...primary, ...fallback]);

import {
  SEARCH_RADII_METERS,
  type NearbyRestaurantQuery,
  type SearchRadiusMeters,
} from '../types/restaurant.js';

type RawNearbyQuery = {
  lat?: string;
  lng?: string;
  radius?: string;
};

type ParseResult =
  | {
      ok: true;
      query: NearbyRestaurantQuery;
    }
  | {
      ok: false;
      details: string[];
    };

const isAllowedRadius = (radius: number): radius is SearchRadiusMeters =>
  SEARCH_RADII_METERS.includes(radius as SearchRadiusMeters);

const parseRequiredNumber = (value: string | undefined, fieldName: 'lat' | 'lng') => {
  if (!value) {
    return { ok: false as const, detail: `${fieldName} is required` };
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return { ok: false as const, detail: `${fieldName} must be a valid number` };
  }

  const [minimum, maximum] =
    fieldName === 'lat' ? [-90, 90] : [-180, 180];
  if (parsed < minimum || parsed > maximum) {
    return {
      ok: false as const,
      detail: `${fieldName} must be between ${minimum} and ${maximum}`,
    };
  }

  return { ok: true as const, value: parsed };
};

export function parseNearbyRestaurantQuery(rawQuery: RawNearbyQuery): ParseResult {
  const details: string[] = [];
  const lat = parseRequiredNumber(rawQuery.lat, 'lat');
  const lng = parseRequiredNumber(rawQuery.lng, 'lng');

  if (!lat.ok) {
    details.push(lat.detail);
  }

  if (!lng.ok) {
    details.push(lng.detail);
  }

  const parsedRadius = rawQuery.radius ? Number(rawQuery.radius) : 3000;
  let radius: SearchRadiusMeters | undefined;

  if (!Number.isFinite(parsedRadius) || !isAllowedRadius(parsedRadius)) {
    details.push('radius must be one of 3000, 5000, 10000');
  } else {
    radius = parsedRadius;
  }

  if (!lat.ok || !lng.ok || !radius || details.length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    query: {
      lat: lat.value,
      lng: lng.value,
      radius,
    },
  };
}

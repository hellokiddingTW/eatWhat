export type SearchRadiusMeters = 3000 | 5000 | 10000;

export const SEARCH_RADII_METERS: SearchRadiusMeters[] = [3000, 5000, 10000];

export type Restaurant = {
  id: string;
  name: string;
  distanceMeters: number;
  isOpenNow: true;
  closingTimeText?: string;
  rating?: number;
  ratingCount?: number;
  address?: string;
  cuisineTypes?: string[];
  location: {
    lat: number;
    lng: number;
  };
  googleMapsUrl: string;
};

export type NearbyRestaurantQuery = {
  lat: number;
  lng: number;
  radius: SearchRadiusMeters;
};

export type NearbyRestaurantResult = {
  restaurants: Restaurant[];
};

export type RestaurantSearchOptions = {
  signal?: AbortSignal;
};

export type RestaurantSearch = (
  query: NearbyRestaurantQuery,
  options?: RestaurantSearchOptions,
) => Promise<NearbyRestaurantResult>;

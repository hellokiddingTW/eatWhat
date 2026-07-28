import type { Restaurant } from '../types/restaurant';
import type { NearbyRestaurantResult } from './restaurantsApi';

export type RestaurantSearchState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  restaurants: Restaurant[];
};

type RestaurantSearchAction =
  | { type: 'searchStarted' }
  | { type: 'searchLoaded'; result: NearbyRestaurantResult }
  | { type: 'searchFailed' };

export const INITIAL_RESTAURANT_SEARCH_STATE: RestaurantSearchState = {
  status: 'idle',
  restaurants: [],
};

export const reduceRestaurantSearchState = (
  state: RestaurantSearchState,
  action: RestaurantSearchAction,
): RestaurantSearchState => {
  switch (action.type) {
    case 'searchStarted':
      return {
        status: 'loading',
        restaurants: [],
      };
    case 'searchLoaded':
      return {
        status: 'ready',
        restaurants: action.result.restaurants,
      };
    case 'searchFailed':
      return {
        status: 'error',
        restaurants: [],
      };
  }
};

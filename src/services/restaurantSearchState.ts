import type { Restaurant } from '../types/restaurant';
import type { NearbyRestaurantPage } from './restaurantsApi';
import { mergeRestaurantPages } from './restaurantPages';

export type RestaurantSearchState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  restaurants: Restaurant[];
  nextPageToken?: string;
  pagesLoaded: number;
  isLoadingMore: boolean;
  loadMoreFailed: boolean;
};

type RestaurantSearchAction =
  | { type: 'searchStarted' }
  | { type: 'firstPageLoaded'; page: NearbyRestaurantPage }
  | { type: 'firstPageFailed' }
  | { type: 'nextPageStarted' }
  | { type: 'nextPageLoaded'; page: NearbyRestaurantPage }
  | { type: 'nextPageFailed' };

export const INITIAL_RESTAURANT_SEARCH_STATE: RestaurantSearchState = {
  status: 'idle',
  restaurants: [],
  pagesLoaded: 0,
  isLoadingMore: false,
  loadMoreFailed: false,
};

export const reduceRestaurantSearchState = (
  state: RestaurantSearchState,
  action: RestaurantSearchAction,
): RestaurantSearchState => {
  switch (action.type) {
    case 'searchStarted':
      return {
        ...INITIAL_RESTAURANT_SEARCH_STATE,
        status: 'loading',
      };
    case 'firstPageLoaded':
      return {
        status: 'ready',
        restaurants: action.page.restaurants,
        ...(action.page.nextPageToken
          ? { nextPageToken: action.page.nextPageToken }
          : {}),
        pagesLoaded: 1,
        isLoadingMore: false,
        loadMoreFailed: false,
      };
    case 'firstPageFailed':
      return {
        ...INITIAL_RESTAURANT_SEARCH_STATE,
        status: 'error',
      };
    case 'nextPageStarted':
      return {
        ...state,
        isLoadingMore: true,
        loadMoreFailed: false,
      };
    case 'nextPageLoaded':
      return {
        status: 'ready',
        restaurants: mergeRestaurantPages(
          state.restaurants,
          action.page.restaurants,
        ),
        ...(action.page.nextPageToken
          ? { nextPageToken: action.page.nextPageToken }
          : {}),
        pagesLoaded: state.pagesLoaded + 1,
        isLoadingMore: false,
        loadMoreFailed: false,
      };
    case 'nextPageFailed':
      return {
        ...state,
        isLoadingMore: false,
        loadMoreFailed: true,
      };
  }
};

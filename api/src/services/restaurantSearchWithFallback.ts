import type { RestaurantSearch } from '../types/restaurant.js';
import { mergeRestaurantResults } from './googlePlaceData.js';

const DEFAULT_MINIMUM_RESULTS_BEFORE_FALLBACK = 10;

type CreateFallbackSearchOptions = {
  nearbySearch: RestaurantSearch;
  textSearch: RestaurantSearch;
  minimumResultsBeforeFallback?: number;
};

export const createRestaurantSearchWithFallback = ({
  nearbySearch,
  textSearch,
  minimumResultsBeforeFallback =
    DEFAULT_MINIMUM_RESULTS_BEFORE_FALLBACK,
}: CreateFallbackSearchOptions): RestaurantSearch => {
  return async (query, options) => {
    try {
      const nearbyResult = await nearbySearch(query, options);

      if (
        nearbyResult.restaurants.length >=
        minimumResultsBeforeFallback
      ) {
        return nearbyResult;
      }

      try {
        const textResult = await textSearch(query, options);
        return {
          restaurants: mergeRestaurantResults(
            nearbyResult.restaurants,
            textResult.restaurants,
          ),
        };
      } catch (error) {
        if (options?.signal?.aborted) {
          throw error;
        }

        return nearbyResult;
      }
    } catch (error) {
      if (options?.signal?.aborted) {
        throw error;
      }

      return textSearch(query, options);
    }
  };
};

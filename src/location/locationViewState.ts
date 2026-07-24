import type { Restaurant } from '../types/restaurant';
import type { CurrentLocationResult } from './currentLocation';

export type LocationViewState =
  | { status: 'loading'; isRefreshing: boolean }
  | {
      status: 'ready';
      coordinate: Restaurant['location'];
      accuracyMeters?: number;
      isRefreshing: boolean;
    }
  | { status: 'permissionDenied'; isRefreshing: false }
  | { status: 'error'; isRefreshing: false };

export const INITIAL_LOCATION_STATE: LocationViewState = {
  status: 'loading',
  isRefreshing: false,
};

export const beginLocationRequest = (
  state: LocationViewState,
): LocationViewState =>
  state.status === 'ready'
    ? { ...state, isRefreshing: true }
    : { status: 'loading', isRefreshing: true };

export const applyLocationResult = (
  _state: LocationViewState,
  result: CurrentLocationResult,
): LocationViewState => {
  if (result.status === 'ready') {
    return { ...result, isRefreshing: false };
  }

  return { status: result.status, isRefreshing: false };
};

import * as Location from 'expo-location';
import {
  createCurrentLocationRequester,
  type LocationClient,
} from './currentLocation';

const expoLocationClient: LocationClient = {
  requestForegroundPermission: Location.requestForegroundPermissionsAsync,
  getHighestAccuracyPosition: () =>
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    }),
};

export const createExpoCurrentLocationRequester = () =>
  createCurrentLocationRequester(expoLocationClient);

type AppCoordinate = {
  lat: number;
  lng: number;
};

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapRegion = MapCoordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

const MINIMUM_DELTA = 0.008;
const REGION_PADDING = 1.8;
const roundCoordinate = (value: number) => Number(value.toFixed(6));

export const toMapCoordinate = ({ lat, lng }: AppCoordinate): MapCoordinate => ({
  latitude: lat,
  longitude: lng,
});

export const buildMapRegion = (
  userLocation: AppCoordinate,
  restaurantLocation?: AppCoordinate,
): MapRegion => {
  if (!restaurantLocation) {
    return {
      ...toMapCoordinate(userLocation),
      latitudeDelta: MINIMUM_DELTA,
      longitudeDelta: MINIMUM_DELTA,
    };
  }

  return {
    latitude: roundCoordinate((userLocation.lat + restaurantLocation.lat) / 2),
    longitude: roundCoordinate((userLocation.lng + restaurantLocation.lng) / 2),
    latitudeDelta: roundCoordinate(
      Math.max(Math.abs(userLocation.lat - restaurantLocation.lat) * REGION_PADDING, MINIMUM_DELTA),
    ),
    longitudeDelta: roundCoordinate(
      Math.max(Math.abs(userLocation.lng - restaurantLocation.lng) * REGION_PADDING, MINIMUM_DELTA),
    ),
  };
};

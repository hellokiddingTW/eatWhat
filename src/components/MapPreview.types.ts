import type { Restaurant } from '../types/restaurant';

export type MapPreviewProps = {
  activeRestaurant?: Restaurant;
  userLocation: Restaurant['location'];
};

type RestaurantLabelSource = {
  name: string;
};

export const buildMapMarkerLabels = (
  activeRestaurant?: RestaurantLabelSource,
) => ({
  user: '現在位置',
  ...(activeRestaurant ? { restaurant: activeRestaurant.name } : {}),
});

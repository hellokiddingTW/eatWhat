import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MapMarkerBubble } from './MapMarkerBubble';
import { buildMapMarkerLabels } from './mapMarkerLabels';
import type { MapPreviewProps } from './MapPreview.types';

const formatDistance = (distanceMeters: number) => {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

export function MapPreview({ activeRestaurant }: MapPreviewProps) {
  const labels = buildMapMarkerLabels(activeRestaurant);

  const openGoogleMaps = () => {
    if (activeRestaurant) {
      void Linking.openURL(activeRestaurant.googleMapsUrl);
    }
  };

  return (
    <View style={styles.map}>
      <View style={styles.gridLineVertical} />
      <View style={styles.gridLineHorizontal} />
      <View style={styles.route} />

      <View style={[styles.pin, styles.userPin]}>
        <MapMarkerBubble color="#2563eb" label={labels.user} />
      </View>

      {activeRestaurant ? (
        <View style={[styles.pin, styles.restaurantPin]}>
          <MapMarkerBubble
            color="#ef4444"
            label={labels.restaurant ?? activeRestaurant.name}
          />
        </View>
      ) : null}

      {activeRestaurant ? (
        <Pressable accessibilityRole="link" onPress={openGoogleMaps} style={styles.actionBar}>
          <Text style={styles.actionTitle} numberOfLines={1}>
            {activeRestaurant.name} · {formatDistance(activeRestaurant.distanceMeters)}
          </Text>
          <Text style={styles.actionLink}>Google Maps ↗</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 218,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#d8e0e8',
    backgroundColor: '#edf5f2',
    marginBottom: 14,
  },
  gridLineVertical: {
    position: 'absolute',
    left: '34%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(42, 111, 151, 0.12)',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '44%',
    height: 1,
    backgroundColor: 'rgba(42, 111, 151, 0.12)',
  },
  route: {
    position: 'absolute',
    left: 92,
    top: 92,
    width: 152,
    borderTopWidth: 3,
    borderStyle: 'dashed',
    borderColor: 'rgba(31, 86, 122, 0.4)',
    transform: [{ rotate: '-18deg' }],
  },
  pin: {
    position: 'absolute',
    alignItems: 'center',
  },
  userPin: {
    left: 68,
    top: 112,
  },
  restaurantPin: {
    right: 54,
    top: 62,
  },
  actionBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(209, 218, 228, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
  },
  actionTitle: {
    flex: 1,
    color: '#16202a',
    fontSize: 13,
    fontWeight: '800',
  },
  actionLink: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },
});

import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapMarkerBubble } from './MapMarkerBubble';
import { buildMapRegion, toMapCoordinate } from './mapGeometry';
import { buildMapMarkerLabels } from './mapMarkerLabels';
import type { MapPreviewProps } from './MapPreview.types';

const formatDistance = (distanceMeters: number) => {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

export function MapPreview({ activeRestaurant, userLocation }: MapPreviewProps) {
  const restaurantLocation = activeRestaurant?.location;
  const region = buildMapRegion(userLocation, restaurantLocation);
  const labels = buildMapMarkerLabels(activeRestaurant);

  const openGoogleMaps = () => {
    if (activeRestaurant) {
      void Linking.openURL(activeRestaurant.googleMapsUrl);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        pitchEnabled={false}
        pointerEvents="none"
        provider={PROVIDER_GOOGLE}
        region={region}
        rotateEnabled={false}
        scrollEnabled={false}
        style={StyleSheet.absoluteFill}
        toolbarEnabled={false}
        zoomEnabled={false}
      >
        <Marker
          anchor={{ x: 0.5, y: 1 }}
          coordinate={toMapCoordinate(userLocation)}
          tappable={false}
          tracksViewChanges={false}
        >
          <MapMarkerBubble color="#2563eb" label={labels.user} />
        </Marker>
        {restaurantLocation ? (
          <Marker
            anchor={{ x: 0.5, y: 1 }}
            coordinate={toMapCoordinate(restaurantLocation)}
            key={activeRestaurant.id}
            tappable={false}
            tracksViewChanges={false}
          >
            <MapMarkerBubble
              color="#ef4444"
              label={labels.restaurant ?? activeRestaurant.name}
            />
          </Marker>
        ) : null}
      </MapView>

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
  container: {
    height: 218,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#d8e0e8',
    backgroundColor: '#edf5f2',
    marginBottom: 14,
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

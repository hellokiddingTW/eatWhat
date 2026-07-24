/// <reference types="google.maps" />

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { requireGoogleMapsWebApiKey } from '../config/googleMapsWebConfig';
import {
  loadGoogleMapsWeb,
  type GoogleMapsWebLibraries,
} from '../services/googleMapsWeb';
import type { MapPreviewProps } from './MapPreview.types';

type MapLoadState = 'loading' | 'ready' | 'error';

const mapElementStyle: CSSProperties = {
  width: '100%',
  height: '100%',
};

const formatDistance = (distanceMeters: number) => {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

const sanitizeGoogleMapsError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/AIza[0-9A-Za-z_-]+/g, '[redacted]')
    .replace(/key=[^&\s]+/g, 'key=[redacted]');
};

export function MapPreview({ activeRestaurant, userLocation }: MapPreviewProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | undefined>(undefined);
  const librariesRef = useRef<GoogleMapsWebLibraries | undefined>(undefined);
  const userMarkerRef = useRef<google.maps.Marker | undefined>(undefined);
  const restaurantMarkerRef = useRef<google.maps.Marker | undefined>(undefined);
  const [loadState, setLoadState] = useState<MapLoadState>('loading');

  useEffect(() => {
    let cancelled = false;

    const initializeMap = async () => {
      try {
        const apiKey = requireGoogleMapsWebApiKey(
          process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY,
        );
        const libraries = await loadGoogleMapsWeb(apiKey);

        if (cancelled || !mapElementRef.current) {
          return;
        }

        librariesRef.current = libraries;
        mapRef.current = new libraries.Map(mapElementRef.current, {
          center: userLocation,
          zoom: 15,
          clickableIcons: false,
          disableDefaultUI: true,
          gestureHandling: 'none',
          keyboardShortcuts: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels.icon',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });
        setLoadState('ready');
      } catch (error) {
        console.error('Google Maps web initialization failed:', sanitizeGoogleMapsError(error));
        if (!cancelled) {
          setLoadState('error');
        }
      }
    };

    void initializeMap();

    return () => {
      cancelled = true;
      userMarkerRef.current?.setMap(null);
      restaurantMarkerRef.current?.setMap(null);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const libraries = librariesRef.current;

    if (loadState !== 'ready' || !map || !libraries) {
      return;
    }

    const userCoordinate = userLocation;

    userMarkerRef.current ??= new libraries.Marker({
      clickable: false,
      cursor: 'default',
      icon: {
        path: libraries.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#2563eb',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      map,
      position: userCoordinate,
      title: '你的位置',
      zIndex: 2,
    });
    userMarkerRef.current.setPosition(userCoordinate);

    restaurantMarkerRef.current?.setMap(null);
    restaurantMarkerRef.current = undefined;

    if (!activeRestaurant) {
      map.setCenter(userCoordinate);
      map.setZoom(15);
      return;
    }

    const restaurantCoordinate = activeRestaurant.location;
    restaurantMarkerRef.current = new libraries.Marker({
      clickable: false,
      cursor: 'default',
      icon: {
        path: libraries.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      map,
      position: restaurantCoordinate,
      title: activeRestaurant.name,
      zIndex: 3,
    });

    const bounds = new libraries.LatLngBounds();
    bounds.extend(userCoordinate);
    bounds.extend(restaurantCoordinate);
    map.fitBounds(bounds, {
      top: 24,
      right: 24,
      bottom: 72,
      left: 24,
    });
  }, [activeRestaurant, loadState, userLocation.lat, userLocation.lng]);

  const openGoogleMaps = () => {
    if (activeRestaurant) {
      void Linking.openURL(activeRestaurant.googleMapsUrl);
    }
  };

  return (
    <View style={styles.container}>
      <div aria-label="Google Map" ref={mapElementRef} style={mapElementStyle} />

      {loadState !== 'ready' ? (
        <View style={styles.statusOverlay}>
          <Text style={styles.statusText}>
            {loadState === 'error'
              ? '無法載入 Google Maps，請檢查 Web API key 設定'
              : '正在載入 Google Maps...'}
          </Text>
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
  container: {
    height: 218,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#d8e0e8',
    backgroundColor: '#edf5f2',
    marginBottom: 14,
  },
  statusOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf5f2',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  statusText: {
    color: '#526170',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
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

import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MapPreview } from '../components/MapPreview';
import { RadiusSelector } from '../components/RadiusSelector';
import { RestaurantCard } from '../components/RestaurantCard';
import { StateMessage } from '../components/StateMessage';
import { mockRestaurants } from '../data/mockRestaurants';
import { requestCurrentLocation } from '../location/expoCurrentLocation';
import {
  applyLocationResult,
  beginLocationRequest,
  INITIAL_LOCATION_STATE,
  type LocationViewState,
} from '../location/locationViewState';
import type { SearchRadiusMeters } from '../types/restaurant';

export function HomeScreen() {
  const [selectedRadius, setSelectedRadius] = useState<SearchRadiusMeters>(3000);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | undefined>(
    mockRestaurants[0]?.id,
  );
  const [locationState, setLocationState] = useState<LocationViewState>(
    INITIAL_LOCATION_STATE,
  );

  const visibleRestaurants = useMemo(
    () => mockRestaurants.filter((restaurant) => restaurant.distanceMeters <= selectedRadius),
    [selectedRadius],
  );

  const activeRestaurant =
    visibleRestaurants.find((restaurant) => restaurant.id === activeRestaurantId) ??
    visibleRestaurants[0];

  const refreshLocation = useCallback(async () => {
    setLocationState(beginLocationRequest);
    const result = await requestCurrentLocation();
    setLocationState((current) => applyLocationResult(current, result));
  }, []);

  useEffect(() => {
    void refreshLocation();
  }, [refreshLocation]);

  const updateRadius = (radius: SearchRadiusMeters) => {
    setSelectedRadius(radius);
    const firstRestaurantForRadius = mockRestaurants.find(
      (restaurant) => restaurant.distanceMeters <= radius,
    );
    setActiveRestaurantId(firstRestaurantForRadius?.id);
  };

  const renderRestaurants = () => {
    if (visibleRestaurants.length === 0) {
      return <StateMessage title="目前所選範圍內沒有營業餐廳，試試看擴大搜尋範圍" />;
    }

    return (
      <View style={styles.list}>
        {visibleRestaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            isActive={restaurant.id === activeRestaurant?.id}
            onPress={() => setActiveRestaurantId(restaurant.id)}
          />
        ))}
      </View>
    );
  };

  const renderLocationState = () => {
    if (locationState.status === 'loading') {
      return <StateMessage title="正在取得目前位置..." />;
    }

    if (locationState.status === 'permissionDenied') {
      return (
        <StateMessage
          title="需要定位才能搜尋附近餐廳"
          actionLabel="重新開啟定位"
          onAction={() => void refreshLocation()}
        />
      );
    }

    return (
      <StateMessage
        title="暫時無法取得目前位置，請稍後再試"
        actionLabel="重新整理"
        onAction={() => void refreshLocation()}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>附近還開著</Text>
            <Text style={styles.subtitle}>使用目前位置 · 距離最近優先</Text>
          </View>
          <Pressable
            accessibilityLabel="重新取得目前位置"
            accessibilityRole="button"
            accessibilityState={{
              busy: locationState.isRefreshing,
              disabled: locationState.isRefreshing,
            }}
            disabled={locationState.isRefreshing}
            onPress={() => void refreshLocation()}
            style={[
              styles.locationButton,
              locationState.isRefreshing && styles.locationButtonDisabled,
            ]}
          >
            {locationState.isRefreshing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.locationIcon}>⌖</Text>
            )}
          </Pressable>
        </View>

        <RadiusSelector selectedRadius={selectedRadius} onSelectRadius={updateRadius} />

        {locationState.status === 'ready' ? (
          <>
            <MapPreview
              activeRestaurant={activeRestaurant}
              userLocation={locationState.coordinate}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{selectedRadius / 1000}km 內營業中</Text>
              <Text style={styles.sectionCount}>{visibleRestaurants.length} 間</Text>
            </View>

            {renderRestaurants()}
          </>
        ) : (
          renderLocationState()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    color: '#16202a',
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 5,
    color: '#627181',
    fontSize: 13,
    fontWeight: '600',
  },
  locationButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#132235',
  },
  locationButtonDisabled: {
    opacity: 0.72,
  },
  locationIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#16202a',
    fontSize: 18,
    fontWeight: '900',
  },
  sectionCount: {
    color: '#6b7886',
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
});

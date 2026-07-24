import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MapPreview } from '../components/MapPreview';
import { RadiusSelector } from '../components/RadiusSelector';
import { RestaurantCard } from '../components/RestaurantCard';
import { StateMessage } from '../components/StateMessage';
import { mockRestaurants } from '../data/mockRestaurants';
import type { SearchRadiusMeters } from '../types/restaurant';

type DemoStatus = 'success' | 'loading' | 'empty' | 'permissionDenied' | 'error';

const DEMO_STATUSES: DemoStatus[] = ['success', 'loading', 'empty', 'permissionDenied', 'error'];
const DEMO_USER_LOCATION = { lat: 25.033, lng: 121.565 };

export function HomeScreen() {
  const [selectedRadius, setSelectedRadius] = useState<SearchRadiusMeters>(3000);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | undefined>(
    mockRestaurants[0]?.id,
  );
  const [demoStatus, setDemoStatus] = useState<DemoStatus>('success');

  const visibleRestaurants = useMemo(
    () => mockRestaurants.filter((restaurant) => restaurant.distanceMeters <= selectedRadius),
    [selectedRadius],
  );

  const activeRestaurant =
    visibleRestaurants.find((restaurant) => restaurant.id === activeRestaurantId) ??
    visibleRestaurants[0];

  const updateRadius = (radius: SearchRadiusMeters) => {
    setSelectedRadius(radius);
    const firstRestaurantForRadius = mockRestaurants.find(
      (restaurant) => restaurant.distanceMeters <= radius,
    );
    setActiveRestaurantId(firstRestaurantForRadius?.id);
  };

  const renderContent = () => {
    if (demoStatus === 'loading') {
      return <StateMessage title="正在搜尋附近營業中的餐廳..." />;
    }

    if (demoStatus === 'permissionDenied') {
      return (
        <StateMessage
          title="需要定位才能搜尋附近餐廳"
          actionLabel="重新開啟定位"
          onAction={() => undefined}
        />
      );
    }

    if (demoStatus === 'error') {
      return (
        <StateMessage
          title="暫時無法取得附近餐廳，請稍後再試"
          actionLabel="重新整理"
          onAction={() => undefined}
        />
      );
    }

    if (demoStatus === 'empty' || visibleRestaurants.length === 0) {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>附近還開著</Text>
            <Text style={styles.subtitle}>使用目前位置 · 距離最近優先</Text>
          </View>
          <View style={styles.locationButton}>
            <Text style={styles.locationIcon}>⌖</Text>
          </View>
        </View>

        <RadiusSelector selectedRadius={selectedRadius} onSelectRadius={updateRadius} />
        <MapPreview activeRestaurant={activeRestaurant} userLocation={DEMO_USER_LOCATION} />

        <View style={styles.demoBar}>
          {DEMO_STATUSES.map((status) => (
            <Text
              key={status}
              onPress={() => setDemoStatus(status)}
              style={[styles.demoText, demoStatus === status && styles.demoTextActive]}
            >
              {status}
            </Text>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{selectedRadius / 1000}km 內營業中</Text>
          <Text style={styles.sectionCount}>{visibleRestaurants.length} 間</Text>
        </View>

        {renderContent()}
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
  demoBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  demoText: {
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#e8eef5',
    color: '#596877',
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '800',
  },
  demoTextActive: {
    backgroundColor: '#132235',
    color: '#ffffff',
  },
});

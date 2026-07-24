import { StatusBar } from 'expo-status-bar';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { createExpoCurrentLocationRequester } from '../location/expoCurrentLocation';
import {
  applyLocationResult,
  beginLocationRequest,
  INITIAL_LOCATION_STATE,
  type LocationViewState,
} from '../location/locationViewState';
import { canLoadRestaurantPage } from '../services/restaurantPages';
import {
  INITIAL_RESTAURANT_SEARCH_STATE,
  reduceRestaurantSearchState,
} from '../services/restaurantSearchState';
import { fetchNearbyRestaurantPage } from '../services/restaurantsApi';
import type { SearchRadiusMeters } from '../types/restaurant';

const SEARCH_DEBOUNCE_MS = 200;

export function HomeScreen() {
  const [selectedRadius, setSelectedRadius] = useState<SearchRadiusMeters>(3000);
  const [activeRestaurantId, setActiveRestaurantId] = useState<
    string | undefined
  >();
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [searchState, dispatchSearch] = useReducer(
    reduceRestaurantSearchState,
    INITIAL_RESTAURANT_SEARCH_STATE,
  );
  const [locationState, setLocationState] = useState<LocationViewState>(
    INITIAL_LOCATION_STATE,
  );
  const searchRequestIdRef = useRef(0);
  const loadMoreInFlightRef = useRef(false);
  const lastRequestedPageTokenRef = useRef<string | undefined>(undefined);
  const loadMoreAbortControllerRef = useRef<AbortController | undefined>(
    undefined,
  );
  const requestCurrentLocation = useMemo(
    () => createExpoCurrentLocationRequester(),
    [],
  );

  const activeRestaurant =
    searchState.restaurants.find(
      (restaurant) => restaurant.id === activeRestaurantId,
    ) ?? searchState.restaurants[0];

  const refreshLocation = useCallback(async () => {
    setLocationState(beginLocationRequest);
    const result = await requestCurrentLocation();
    setLocationState((current) => applyLocationResult(current, result));
    if (result.status === 'ready') {
      setSearchAttempt((attempt) => attempt + 1);
    }
  }, [requestCurrentLocation]);

  useEffect(() => {
    void refreshLocation();
  }, [refreshLocation]);

  useEffect(() => {
    if (locationState.status !== 'ready') {
      return;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    loadMoreInFlightRef.current = false;
    lastRequestedPageTokenRef.current = undefined;
    loadMoreAbortControllerRef.current?.abort();
    loadMoreAbortControllerRef.current = undefined;
    dispatchSearch({ type: 'searchStarted' });
    setActiveRestaurantId(undefined);

    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      void fetchNearbyRestaurantPage(
        {
          lat: locationState.coordinate.lat,
          lng: locationState.coordinate.lng,
          radius: selectedRadius,
        },
        {
          signal: abortController.signal,
        },
      )
        .then((page) => {
          if (
            !abortController.signal.aborted &&
            searchRequestIdRef.current === requestId
          ) {
            dispatchSearch({ type: 'firstPageLoaded', page });
          }
        })
        .catch(() => {
          if (
            !abortController.signal.aborted &&
            searchRequestIdRef.current === requestId
          ) {
            dispatchSearch({ type: 'firstPageFailed' });
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      abortController.abort();
    };
  }, [
    locationState.status === 'ready' ? locationState.coordinate.lat : undefined,
    locationState.status === 'ready' ? locationState.coordinate.lng : undefined,
    searchAttempt,
    selectedRadius,
  ]);

  const updateRadius = (radius: SearchRadiusMeters) => {
    setSelectedRadius(radius);
    setActiveRestaurantId(undefined);
  };

  const loadNextPage = useCallback(async (isManualRetry = false) => {
    if (
      locationState.status !== 'ready' ||
      loadMoreInFlightRef.current ||
      !canLoadRestaurantPage(
        searchState.pagesLoaded,
        searchState.nextPageToken,
      )
    ) {
      return;
    }

    const pageToken = searchState.nextPageToken;
    if (!pageToken) {
      return;
    }

    if (
      !isManualRetry &&
      lastRequestedPageTokenRef.current === pageToken
    ) {
      return;
    }

    const requestId = searchRequestIdRef.current;
    const abortController = new AbortController();
    loadMoreInFlightRef.current = true;
    lastRequestedPageTokenRef.current = pageToken;
    loadMoreAbortControllerRef.current = abortController;
    dispatchSearch({ type: 'nextPageStarted' });

    try {
      const page = await fetchNearbyRestaurantPage(
        {
          lat: locationState.coordinate.lat,
          lng: locationState.coordinate.lng,
          radius: selectedRadius,
          pageToken,
        },
        {
          signal: abortController.signal,
        },
      );

      if (
        !abortController.signal.aborted &&
        searchRequestIdRef.current === requestId
      ) {
        dispatchSearch({ type: 'nextPageLoaded', page });
      }
    } catch {
      if (
        !abortController.signal.aborted &&
        searchRequestIdRef.current === requestId
      ) {
        dispatchSearch({ type: 'nextPageFailed' });
      }
    } finally {
      if (loadMoreAbortControllerRef.current === abortController) {
        loadMoreAbortControllerRef.current = undefined;
        loadMoreInFlightRef.current = false;
      }
    }
  }, [
    locationState,
    searchState.nextPageToken,
    searchState.pagesLoaded,
    selectedRadius,
  ]);

  const handleScroll = ({
    nativeEvent,
  }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    const isNearEnd =
      contentOffset.y > 0 &&
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 320;

    if (isNearEnd) {
      void loadNextPage();
    }
  };

  const renderRestaurants = () => {
    if (
      searchState.status === 'idle' ||
      searchState.status === 'loading'
    ) {
      return <StateMessage title="正在搜尋附近營業中的餐廳..." />;
    }

    if (searchState.status === 'error') {
      return (
        <StateMessage
          title="暫時無法取得附近餐廳，請稍後再試"
          actionLabel="重新整理"
          onAction={() => setSearchAttempt((attempt) => attempt + 1)}
        />
      );
    }

    if (searchState.restaurants.length === 0) {
      return <StateMessage title="目前所選範圍內沒有營業餐廳，試試看擴大搜尋範圍" />;
    }

    return (
      <View style={styles.list}>
        {searchState.restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            isActive={restaurant.id === activeRestaurant?.id}
            onPress={() => setActiveRestaurantId(restaurant.id)}
          />
        ))}
        {searchState.isLoadingMore ? (
          <View style={styles.paginationStatus}>
            <ActivityIndicator color="#132235" size="small" />
            <Text style={styles.paginationText}>正在載入更多餐廳...</Text>
          </View>
        ) : null}
        {searchState.loadMoreFailed ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadNextPage(true)}
            style={styles.paginationRetry}
          >
            <Text style={styles.paginationRetryText}>重新載入更多餐廳</Text>
          </Pressable>
        ) : null}
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
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
              <Text style={styles.sectionCount}>
                {searchState.status === 'ready'
                  ? `${searchState.restaurants.length} 間`
                  : '搜尋中'}
              </Text>
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
  paginationStatus: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  paginationText: {
    color: '#627181',
    fontSize: 13,
    fontWeight: '700',
  },
  paginationRetry: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e0e8',
    backgroundColor: '#ffffff',
  },
  paginationRetryText: {
    color: '#132235',
    fontSize: 13,
    fontWeight: '800',
  },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Restaurant } from '../types/restaurant';

type RestaurantCardProps = {
  restaurant: Restaurant;
  isActive: boolean;
  onPress: () => void;
};

const formatDistance = (distanceMeters: number) => {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

export function RestaurantCard({ restaurant, isActive, onPress }: RestaurantCardProps) {
  const cuisineText = restaurant.cuisineTypes?.join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={[styles.card, isActive && styles.cardActive]}
    >
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.name}>{restaurant.name}</Text>
          {cuisineText ? <Text style={styles.cuisine}>{cuisineText}</Text> : null}
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>營業中</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <MetaPill icon="⌖" label={formatDistance(restaurant.distanceMeters)} />
        {restaurant.closingTimeText ? <MetaPill icon="◷" label={restaurant.closingTimeText} /> : null}
        {restaurant.rating ? <MetaPill icon="★" label={restaurant.rating.toFixed(1)} /> : null}
      </View>
    </Pressable>
  );
}

function MetaPill({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaIcon}>{icon}</Text>
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d8e0e8',
    backgroundColor: '#ffffff',
    padding: 14,
  },
  cardActive: {
    borderColor: '#132235',
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  titleBlock: {
    flex: 1,
  },
  name: {
    color: '#16202a',
    fontSize: 16,
    fontWeight: '800',
  },
  cuisine: {
    marginTop: 4,
    color: '#7a8794',
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 13,
    backgroundColor: '#dff7ea',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#167044',
    fontSize: 11,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  metaPill: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 9,
  },
  metaIcon: {
    color: '#132235',
    fontSize: 12,
    fontWeight: '900',
  },
  metaText: {
    color: '#465565',
    fontSize: 12,
    fontWeight: '700',
  },
});

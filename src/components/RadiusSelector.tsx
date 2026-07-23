import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SEARCH_RADII_METERS, type SearchRadiusMeters } from '../types/restaurant';

type RadiusSelectorProps = {
  selectedRadius: SearchRadiusMeters;
  onSelectRadius: (radius: SearchRadiusMeters) => void;
};

const formatRadius = (radius: SearchRadiusMeters) => `${radius / 1000} km`;

export function RadiusSelector({ selectedRadius, onSelectRadius }: RadiusSelectorProps) {
  return (
    <View style={styles.container}>
      {SEARCH_RADII_METERS.map((radius) => {
        const isActive = radius === selectedRadius;

        return (
          <Pressable
            key={radius}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onSelectRadius(radius)}
            style={[styles.option, isActive && styles.optionActive]}
          >
            <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
              {formatRadius(radius)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  option: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#d8e0e8',
    backgroundColor: '#ffffff',
  },
  optionActive: {
    backgroundColor: '#132235',
    borderColor: '#132235',
  },
  optionText: {
    color: '#384656',
    fontSize: 14,
    fontWeight: '700',
  },
  optionTextActive: {
    color: '#ffffff',
  },
});

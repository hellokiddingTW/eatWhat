import { StyleSheet, Text, View } from 'react-native';

type MapMarkerBubbleProps = {
  color: string;
  label: string;
};

export function MapMarkerBubble({ color, label }: MapMarkerBubbleProps) {
  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.label}>
        <Text numberOfLines={1} style={styles.labelText}>
          {label}
        </Text>
      </View>
      <View style={styles.pointer} />
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 144,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  label: {
    maxWidth: 132,
    minHeight: 26,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d8e0e8',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  labelText: {
    color: '#16202a',
    fontSize: 11,
    fontWeight: '800',
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },
  dot: {
    width: 18,
    height: 18,
    marginTop: 2,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

type StateMessageProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StateMessage({ title, actionLabel, onAction }: StateMessageProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 168,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d8e0e8',
    backgroundColor: '#ffffff',
    padding: 18,
  },
  title: {
    color: '#465565',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  button: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#132235',
    paddingHorizontal: 18,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});

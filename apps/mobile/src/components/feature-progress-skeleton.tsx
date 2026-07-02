import { StyleSheet, View } from 'react-native';

export function FeatureProgressSkeleton() {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <View key={index} style={styles.card}>
          <View style={[styles.block, styles.title]} />
          <View style={[styles.block, styles.line]} />
          <View style={[styles.block, styles.lineShort]} />
          <View style={[styles.block, styles.progress]} />
          <View style={styles.buttonRow}>
            <View style={[styles.block, styles.button]} />
            <View style={[styles.block, styles.buttonSecondary]} />
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#102247',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  block: {
    backgroundColor: '#24385F',
    borderRadius: 8,
  },
  title: {
    width: '48%',
    height: 18,
  },
  line: {
    width: '100%',
    height: 12,
    marginTop: 12,
  },
  lineShort: {
    width: '76%',
    height: 12,
    marginTop: 8,
  },
  progress: {
    width: '100%',
    height: 10,
    marginTop: 14,
    borderRadius: 999,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  button: {
    width: 158,
    height: 44,
    marginRight: 10,
    borderRadius: 14,
  },
  buttonSecondary: {
    width: 132,
    height: 44,
    borderRadius: 14,
  },
});

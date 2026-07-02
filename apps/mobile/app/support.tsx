import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function SupportScreen() {
  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Retour</Text>
      </Pressable>
      <Text style={styles.title}>Support</Text>
      <Text style={styles.text}>
        Point d entree V1 pour scanner un kit, obtenir de l aide ou contacter l equipe.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  back: {
    color: '#E94560',
    fontSize: 16,
    marginBottom: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  text: {
    color: '#A6B4C8',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
});

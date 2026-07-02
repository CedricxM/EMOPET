import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FeatureProgressCardView } from '../../src/components/feature-progress-card';
import { FeatureProgressSkeleton } from '../../src/components/feature-progress-skeleton';
import { useFeatureProgress } from '../../src/hooks/use-feature-progress';

export default function DiscoverScreen() {
  const { services, loading, error, onAction } = useFeatureProgress();
  const preview = services.filter((item) =>
    item.serviceId === 'community_morning_question' || item.serviceId === 'copresence',
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Decouvrir</Text>
      <Text style={styles.subtitle}>
        Communaute, contenus free-safe et parcours de progression.
      </Text>

      <Pressable style={styles.card} onPress={() => router.push('/progress' as never)}>
        <Text style={styles.cardTitle}>Avancement EMOPET</Text>
        <Text style={styles.cardText}>
          Suivre ce qui est planifie, en construction, en beta ou deja visible mais verrouille.
        </Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Communaute</Text>
        <Text style={styles.cardText}>
          Le mode free garde l acces aux communautes, aux contenus de relation et aux reperes
          educatifs.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Community AI visible</Text>
      <Text style={styles.helper}>
        Des fonctions communautaires peuvent etre visibles avant ouverture, avec raison claire et
        action possible.
      </Text>
      {loading ? <FeatureProgressSkeleton /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error
        ? preview.map((item) => (
            <FeatureProgressCardView key={item.serviceId} item={item} onAction={onAction} />
          ))
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#A6B4C8',
    marginTop: 4,
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#0F3460',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cardText: {
    color: '#A6B4C8',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  helper: {
    color: '#A6B4C8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  error: {
    color: '#F3A64C',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
});

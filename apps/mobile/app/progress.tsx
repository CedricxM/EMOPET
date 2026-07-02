import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FeatureProgressCardView } from '../src/components/feature-progress-card';
import { FeatureProgressSkeleton } from '../src/components/feature-progress-skeleton';
import { useFeatureProgress } from '../src/hooks/use-feature-progress';

const GROUPS = [
  { key: 'beta', title: 'Beta disponible' },
  { key: 'building', title: 'En construction' },
  { key: 'planned', title: 'Prevu' },
] as const;

export default function ProgressScreen() {
  const { services, loading, error, onAction } = useFeatureProgress();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Retour</Text>
      </Pressable>
      <Text style={styles.title}>Avancement EMOPET</Text>
      <Text style={styles.subtitle}>Voici ce qui arrive, et ce qui depend de vous.</Text>
      <Text style={styles.helper}>
        On vous le montre des maintenant, mais on l active seulement quand c est sur:
        moderation, confidentialite, consentements et donnees suffisantes.
      </Text>

      {loading ? <FeatureProgressSkeleton /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error
        ? GROUPS.map((group) => {
            const items = services.filter((service) => service.status === group.key);
            if (items.length === 0) {
              return null;
            }

            return (
              <View key={group.key} style={styles.group}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                {items.map((item) => (
                  <FeatureProgressCardView
                    key={item.serviceId}
                    item={item}
                    onAction={onAction}
                  />
                ))}
              </View>
            );
          })
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
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 24,
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
  subtitle: {
    color: '#A6B4C8',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  helper: {
    color: '#BFD0E5',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 18,
  },
  group: {
    marginBottom: 10,
  },
  groupTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  error: {
    color: '#F3A64C',
    fontSize: 14,
    lineHeight: 20,
  },
});

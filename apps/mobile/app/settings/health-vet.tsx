import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { createVetReportShareLink } from '../../src/services/report';
import { useAuthStore, useDogStore, usePreferencesStore } from '../../src/store';

export default function HealthVetScreen() {
  const token = useAuthStore((state) => state.token);
  const selectedDogId = useDogStore((state) => state.selectedDogId) ?? 'demo-dog';
  const vetExportOptIn = usePreferencesStore((state) => state.consents.vet_export_opt_in);
  const setConsent = usePreferencesStore((state) => state.setConsent);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleExport(): Promise<void> {
    if (!vetExportOptIn) {
      setFeedback('Activez d abord l opt-in export veterinaire.');
      return;
    }

    setLoading(true);
    setFeedback('Generation du rapport en cours...');
    try {
      const payload = await createVetReportShareLink(selectedDogId, token);
      await Share.share({
        title: 'Rapport veterinaire EMOPET',
        message: payload.url,
      });
      setFeedback('Rapport pret a etre partage.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Export impossible pour le moment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Retour</Text>
      </Pressable>
      <Text style={styles.title}>Sante & Veterinaire</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Rapport 14 jours</Text>
        <Text style={styles.helper}>
          Export PDF passif, non medical, avec couverture de donnees, tendances et notes proprietaire.
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Opt-in export veterinaire</Text>
          <Switch
            value={vetExportOptIn}
            onValueChange={(value) => setConsent('vet_export_opt_in', value)}
            trackColor={{ false: '#3B4D73', true: '#E94560' }}
          />
        </View>
        <Pressable style={styles.exportButton} onPress={handleExport} disabled={loading}>
          <Text style={styles.exportButtonText}>Exporter rapport veterinaire (14 jours)</Text>
        </Pressable>
        {loading ? <ActivityIndicator color="#FFFFFF" style={styles.loader} /> : null}
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </View>
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
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#102247',
    borderRadius: 18,
    padding: 16,
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
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
  exportButton: {
    marginTop: 18,
    backgroundColor: '#E94560',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loader: {
    marginTop: 12,
  },
  feedback: {
    color: '#BFD0E5',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
});

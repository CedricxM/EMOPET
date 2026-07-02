import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchAbsenceComparison, type AbsenceComparisonPayload } from '../../src/services/report';
import { useAuthStore, useDogStore } from '../../src/store';

function ComparisonBar({
  label,
  presentValue,
  absentValue,
}: {
  label: string;
  presentValue: number;
  absentValue: number;
}) {
  const max = Math.max(1, presentValue, absentValue);

  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{label}</Text>
      <Text style={styles.metricLine}>Presence</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${(presentValue / max) * 100}%` }]} />
      </View>
      <Text style={styles.metricValue}>{presentValue.toFixed(1)}</Text>
      <Text style={styles.metricLine}>Absence</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFillAbsence, { width: `${(absentValue / max) * 100}%` }]} />
      </View>
      <Text style={styles.metricValue}>{absentValue.toFixed(1)}</Text>
    </View>
  );
}

export default function AbsenceScreen() {
  const token = useAuthStore((state) => state.token);
  const selectedDogId = useDogStore((state) => state.selectedDogId) ?? 'demo-dog';
  const [payload, setPayload] = useState<AbsenceComparisonPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchAbsenceComparison(selectedDogId, token)
      .then((value) => {
        if (mounted) {
          setPayload(value);
        }
      })
      .catch((reason: unknown) => {
        if (mounted) {
          setError(reason instanceof Error ? reason.message : 'Impossible de charger la comparaison.');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedDogId, token]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Retour</Text>
      </Pressable>
      <Text style={styles.title}>Mode Absence</Text>

      {loading ? (
        <ActivityIndicator color="#E94560" size="large" style={styles.loader} />
      ) : error ? (
        <Text style={styles.message}>{error}</Text>
      ) : payload && payload.comparison.gate === 'REJECT' ? (
        <Text style={styles.message}>Pas assez de donnees pour comparer presence et absence.</Text>
      ) : payload ? (
        <>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Confiance {Math.round(payload.comparison.confidence * 100)}%</Text>
            </View>
            <View style={styles.badgeSecondary}>
              <Text style={styles.badgeText}>{payload.comparison.gate}</Text>
            </View>
          </View>
          <Text style={styles.helper}>{payload.message}</Text>
          <ComparisonBar
            label="Vocalisations / h"
            presentValue={payload.comparison.present_vocal_events_per_hour}
            absentValue={payload.comparison.absent_vocal_events_per_hour}
          />
          <ComparisonBar
            label="Agitation moyenne"
            presentValue={payload.comparison.present_imu_agitation_index_mean}
            absentValue={payload.comparison.absent_imu_agitation_index_mean}
          />
          <ComparisonBar
            label="Repos mat (min)"
            presentValue={payload.comparison.present_mat_rest_min}
            absentValue={payload.comparison.absent_mat_rest_min}
          />
        </>
      ) : null}
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
    marginBottom: 16,
  },
  loader: {
    marginTop: 32,
  },
  message: {
    color: '#BFD0E5',
    fontSize: 15,
    lineHeight: 22,
  },
  helper: {
    color: '#A6B4C8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#E94560',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  badgeSecondary: {
    backgroundColor: '#0F3460',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  metricCard: {
    backgroundColor: '#102247',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  metricTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  metricLine: {
    color: '#BFD0E5',
    fontSize: 13,
    marginTop: 8,
  },
  barTrack: {
    backgroundColor: '#24385F',
    borderRadius: 999,
    height: 10,
    overflow: 'hidden',
    marginTop: 6,
  },
  barFill: {
    backgroundColor: '#7AD3A8',
    height: '100%',
    borderRadius: 999,
  },
  barFillAbsence: {
    backgroundColor: '#F3A64C',
    height: '100%',
    borderRadius: 999,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 4,
  },
});

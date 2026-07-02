import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { usePreferencesStore } from '../../src/store';

export default function BehaviorSettingsScreen() {
  const passivePhoneDetectionEnabled = usePreferencesStore(
    (state) => state.passivePhoneDetectionEnabled,
  );
  const manualPresenceOverride = usePreferencesStore((state) => state.manualPresenceOverride);
  const setPassivePhoneDetectionEnabled = usePreferencesStore(
    (state) => state.setPassivePhoneDetectionEnabled,
  );
  const setManualPresenceOverride = usePreferencesStore((state) => state.setManualPresenceOverride);

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Retour</Text>
      </Pressable>
      <Text style={styles.title}>Comportement</Text>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mode Absence</Text>
        <Text style={styles.helper}>
          Detection passive via telephone, avec comparaison presence / absence confidence-aware.
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Detection passive via telephone</Text>
          <Switch
            value={passivePhoneDetectionEnabled}
            onValueChange={setPassivePhoneDetectionEnabled}
            trackColor={{ false: '#3B4D73', true: '#E94560' }}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Override manuel</Text>
        <View style={styles.buttonRow}>
          <Pressable
            style={[
              styles.actionButton,
              manualPresenceOverride === 'absence' && styles.actionButtonActive,
            ]}
            onPress={() => setManualPresenceOverride('absence')}
          >
            <Text style={styles.actionLabel}>Je pars</Text>
          </Pressable>
          <Pressable
            style={[
              styles.actionButton,
              manualPresenceOverride === 'present' && styles.actionButtonActive,
            ]}
            onPress={() => setManualPresenceOverride('present')}
          >
            <Text style={styles.actionLabel}>Je reviens</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.card} onPress={() => router.push('/settings/absence' as never)}>
        <Text style={styles.sectionTitle}>Voir la comparaison</Text>
        <Text style={styles.helper}>
          Barres presence / absence, badge de confiance, et message "pas assez de donnees" si besoin.
        </Text>
      </Pressable>
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
    marginBottom: 14,
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
    marginTop: 10,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#0F3460',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 10,
  },
  actionButtonActive: {
    backgroundColor: '#E94560',
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

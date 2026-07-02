import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { usePreferencesStore } from '../../src/store';
import { FirmwareVersionRow } from '../../src/components/firmware-version-row';
import { useV6Insights } from '../../src/hooks/use-v6-insights';

const TIERS: Array<'free' | 'trial' | 'kit' | 'premium'> = ['free', 'trial', 'kit', 'premium'];

export default function SettingsScreen() {
  const subscriptionTier = usePreferencesStore((state) => state.subscriptionTier);
  const hardwareLinked = usePreferencesStore((state) => state.hardwareLinked);
  const consents = usePreferencesStore((state) => state.consents);
  const setSubscriptionTier = usePreferencesStore((state) => state.setSubscriptionTier);
  const setHardwareLinked = usePreferencesStore((state) => state.setHardwareLinked);
  const setConsent = usePreferencesStore((state) => state.setConsent);
  const insights = useV6Insights();

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Retour</Text>
      </Pressable>
      <Text style={styles.title}>Options avancees</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Entitlements V1</Text>
        <Text style={styles.helper}>Le mode free reste sans insights capteurs.</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Kit lie</Text>
          <Switch
            value={hardwareLinked}
            onValueChange={setHardwareLinked}
            trackColor={{ false: '#3B4D73', true: '#E94560' }}
          />
        </View>
        <Text style={styles.label}>Tier</Text>
        <View style={styles.pillRow}>
          {TIERS.map((tier) => (
            <Pressable
              key={tier}
              style={[styles.pill, subscriptionTier === tier && styles.pillActive]}
              onPress={() => setSubscriptionTier(tier)}
            >
              <Text style={[styles.pillText, subscriptionTier === tier && styles.pillTextActive]}>
                {tier}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Comportement</Text>
        <Pressable style={styles.linkRow} onPress={() => router.push('/settings/behavior' as never)}>
          <Text style={styles.linkLabel}>Mode Absence</Text>
          <Text style={styles.chevron}>{'>'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Communaute & Services</Text>
        <Text style={styles.helper}>
          Fonctions visibles mais verrouillees, avec raison claire, progression et CTA actif.
        </Text>
        <Pressable style={styles.linkRow} onPress={() => router.push('/services' as never)}>
          <Text style={styles.linkLabel}>Voir les services visibles</Text>
          <Text style={styles.chevron}>{'>'}</Text>
        </Pressable>
        <Pressable
          style={[styles.linkRow, styles.linkRowSpaced]}
          onPress={() => router.push('/progress' as never)}
        >
          <Text style={styles.linkLabel}>Voir ma progression</Text>
          <Text style={styles.chevron}>{'>'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Consentements</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Localisation passive</Text>
          <Switch
            value={consents.location_opt_in}
            onValueChange={(value) => setConsent('location_opt_in', value)}
            trackColor={{ false: '#3B4D73', true: '#E94560' }}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Communaute</Text>
          <Switch
            value={consents.community_opt_in}
            onValueChange={(value) => setConsent('community_opt_in', value)}
            trackColor={{ false: '#3B4D73', true: '#E94560' }}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Export veterinaire</Text>
          <Switch
            value={consents.vet_export_opt_in}
            onValueChange={(value) => setConsent('vet_export_opt_in', value)}
            trackColor={{ false: '#3B4D73', true: '#E94560' }}
          />
        </View>
      </View>

      <Pressable style={styles.card} onPress={() => router.push('/settings/ai-tone' as never)}>
        <Text style={styles.sectionTitle}>IA & Tonalite</Text>
        <Text style={styles.helper}>
          Choisir explicitement le style regional de Bleiz, avec default communaute,
          override personnel et preview.
        </Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Firmware</Text>
        <FirmwareVersionRow label="MAT" version={insights.firmwareVersionMat} />
        <FirmwareVersionRow label="TAG" version={insights.firmwareVersionTag} />
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
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  pill: {
    borderWidth: 1,
    borderColor: '#3B4D73',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginTop: 8,
  },
  pillActive: {
    backgroundColor: '#E94560',
    borderColor: '#E94560',
  },
  pillText: {
    color: '#BFD0E5',
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkRowSpaced: {
    marginTop: 14,
  },
  linkLabel: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  chevron: {
    color: '#78909C',
    fontSize: 22,
  },
});

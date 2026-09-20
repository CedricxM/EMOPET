import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useAuthStore, usePreferencesStore } from '../../src/store';
import { FirmwareVersionRow } from '../../src/components/firmware-version-row';
import { useV6Insights } from '../../src/hooks/use-v6-insights';
import { saveFeatureConsent } from '../../src/services/feature-progress';

export default function SettingsScreen() {
  const token = useAuthStore((state) => state.token);
  const consents = usePreferencesStore((state) => state.consents);
  const setConsent = usePreferencesStore((state) => state.setConsent);
  const activateCommunityConsentFromDurableAuthority = usePreferencesStore(
    (state) => state.activateCommunityConsentFromDurableAuthority,
  );
  const insights = useV6Insights();

  function onLocationConsentChange(value: boolean): void {
    if (!value) {
      setConsent('location_opt_in', false);
      return;
    }

    Alert.alert(
      'Activation protegee',
      'La localisation ne peut pas etre activee par un simple switch local. Utilisez le parcours Proximite quand l enregistrement durable du consentement est disponible.',
    );
  }

  async function onCommunityConsentChange(value: boolean): Promise<void> {
    if (!value) {
      setConsent('community_opt_in', false);
      return;
    }

    try {
      await saveFeatureConsent(token, {
        purpose: 'community_opt_in',
        status: 'accepted',
        context: 'settings_community_opt_in',
      });
      activateCommunityConsentFromDurableAuthority();
    } catch (reason: unknown) {
      Alert.alert(
        'Communaute indisponible',
        reason instanceof Error
          ? reason.message
          : 'Le consentement Communaute n a pas pu etre enregistre durablement.',
      );
    }
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Retour</Text>
      </Pressable>
      <Text style={styles.title}>Options avancees</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Compte & materiel</Text>
        <Text style={styles.helper}>
          Le niveau d abonnement et l association MAT/TAG ne sont pas modifiables localement.
          Ils seront affiches ici quand une autorite compte/device de reference sera cablee.
        </Text>
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
        <Text style={styles.sectionTitle}>Preferences & consentements</Text>
        <Text style={styles.helper}>
          Localisation et Communaute ne peuvent devenir actives qu apres enregistrement durable.
          Le souhait de partage veterinaire reste une preference locale et ne donne acces a aucune clinique.
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Localisation passive</Text>
          <Switch
            value={consents.location_opt_in}
            onValueChange={onLocationConsentChange}
            trackColor={{ false: '#3B4D73', true: '#E94560' }}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Communaute</Text>
          <Switch
            value={consents.community_opt_in}
            onValueChange={(value) => {
              void onCommunityConsentChange(value);
            }}
            trackColor={{ false: '#3B4D73', true: '#E94560' }}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Souhait de partage veterinaire (preference locale)</Text>
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
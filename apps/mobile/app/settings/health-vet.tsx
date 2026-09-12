import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { usePreferencesStore } from '../../src/store';

export default function HealthVetScreen() {
  const vetExportOptIn = usePreferencesStore((state) => state.consents.vet_export_opt_in);
  const setConsent = usePreferencesStore((state) => state.setConsent);

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Retour</Text>
      </Pressable>
      <Text style={styles.title}>Sante & Veterinaire</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Partage professionnel</Text>
        <Text style={styles.helper}>
          Cette preference indique seulement si vous souhaitez utiliser les fonctions de partage
          veterinaire. Elle ne donne acces a aucune clinique et ne partage aucune donnee a elle seule.
        </Text>

        <View style={styles.row}>
          <View style={styles.labelColumn}>
            <Text style={styles.label}>Autoriser les fonctions de partage</Text>
            <Text style={styles.secondary}>
              Chaque futur partage devra nommer le destinataire, les donnees, la periode et la date
              d expiration. Vous pourrez le revoquer.
            </Text>
          </View>
          <Switch
            value={vetExportOptIn}
            onValueChange={(value) => setConsent('vet_export_opt_in', value)}
            trackColor={{ false: '#3B4D73', true: '#E94560' }}
          />
        </View>

        <View style={styles.holdBox}>
          <Text style={styles.holdTitle}>Acces nominatif en preparation</Text>
          <Text style={styles.holdText}>
            Le lien generique a ete retire du parcours. EMOPET utilisera un acces lie a un destinataire,
            limite dans le temps et dans son perimetre, avec revocation et historique d acces.
          </Text>
        </View>

        <Pressable style={styles.disabledButton} disabled accessibilityState={{ disabled: true }}>
          <Text style={styles.disabledButtonText}>Creer un acces pour mon veterinaire</Text>
        </Pressable>
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
    marginTop: 16,
  },
  labelColumn: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondary: {
    color: '#93A5BE',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  holdBox: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#3B4D73',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#162A50',
  },
  holdTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  holdText: {
    color: '#A6B4C8',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  disabledButton: {
    marginTop: 16,
    backgroundColor: '#34435F',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    opacity: 0.72,
  },
  disabledButtonText: {
    color: '#C4CDDA',
    fontSize: 15,
    fontWeight: '700',
  },
});

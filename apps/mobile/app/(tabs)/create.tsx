/**
 * Create tab — post creation / action menu.
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';

const ACTIONS = [
  { label: 'Partager un moment', icon: '📸' },
  { label: 'Poser une question', icon: '❓' },
  { label: 'Lancer un defi', icon: '🏆' },
  { label: 'Creer un evenement', icon: '📅' },
  { label: 'Demander de l\'aide', icon: '🤝' },
];

export default function CreateScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Creer</Text>
      {ACTIONS.map((action) => (
        <Pressable key={action.label} style={styles.actionCard}>
          <Text style={styles.actionIcon}>{action.icon}</Text>
          <Text style={styles.actionLabel}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F3460',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  actionLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});

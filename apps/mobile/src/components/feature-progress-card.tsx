import type { FeatureProgressCard, FeatureProgressCta } from '@emopet/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface FeatureProgressCardProps {
  item: FeatureProgressCard;
  onAction: (action: FeatureProgressCta, item: FeatureProgressCard) => void;
}

function getBadgeColor(status: FeatureProgressCard['status']): string {
  switch (status) {
    case 'beta':
      return '#E94560';
    case 'building':
      return '#F3A64C';
    case 'shipped':
      return '#3CB179';
    case 'planned':
    default:
      return '#4B5F87';
  }
}

export function FeatureProgressCardView({
  item,
  onAction,
}: FeatureProgressCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={[styles.badge, { backgroundColor: getBadgeColor(item.status) }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.summary}>{item.summary}</Text>

      {item.lockedReason ? <Text style={styles.lockedReason}>Pourquoi c est verrouille: {item.lockedReason}</Text> : null}
      {item.whyLocked ? <Text style={styles.helper}>{item.whyLocked}</Text> : null}

      {item.progress.steps.length > 0 ? (
        <>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progression</Text>
            <Text style={styles.progressPct}>{item.progress.pct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${item.progress.pct}%` }]} />
          </View>
          {item.progress.steps.map((step) => (
            <Text key={step.key} style={styles.step}>
              {step.state === 'done' ? 'OK' : step.state === 'blocked' ? '...' : 'A faire'} {step.label}
            </Text>
          ))}
        </>
      ) : null}

      <View style={styles.ctaRow}>
        {item.cta.map((action) => (
          <Pressable
            key={`${item.serviceId}-${action.label}`}
            style={[
              styles.cta,
              action.type === 'learn_more' || action.type === 'view_progress'
                ? styles.ctaSecondary
                : styles.ctaPrimary,
            ]}
            onPress={() => onAction(action, item)}
          >
            <Text style={styles.ctaText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#102247',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  summary: {
    color: '#BFD0E5',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  lockedReason: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  helper: {
    color: '#A6B4C8',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  progressLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  progressPct: {
    color: '#BFD0E5',
    fontSize: 13,
  },
  progressTrack: {
    backgroundColor: '#24385F',
    borderRadius: 999,
    height: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    backgroundColor: '#E94560',
    height: '100%',
    borderRadius: 999,
  },
  step: {
    color: '#BFD0E5',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  cta: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 10,
  },
  ctaPrimary: {
    backgroundColor: '#E94560',
  },
  ctaSecondary: {
    backgroundColor: '#0F3460',
    borderWidth: 1,
    borderColor: '#2A3A5E',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

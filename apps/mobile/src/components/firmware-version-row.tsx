/**
 * FirmwareVersionRow — settings screen row showing the device firmware
 * version and a "new version available" badge when version < 6.0.0.
 */

import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, spacing } from '../theme';

interface Props {
  label: 'MAT' | 'TAG';
  version: string;
}

function isPreV6(version: string): boolean {
  if (version === 'unknown') return false;
  const parts = version.split('.').map((n) => parseInt(n, 10));
  if (parts.length < 3 || parts.some(Number.isNaN)) return false;
  return parts[0]! < 6;
}

export function FirmwareVersionRow({ label, version }: Props) {
  const showBadge = isPreV6(version);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.rightCol}>
        <Text style={styles.version}>{version}</Text>
        {showBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Nouvelle version disponible</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.s2,
  },
  label: {
    fontFamily: fontFamily.sansSemi,
    fontSize: 15,
    fontWeight: '600',
    color: colors.fgStrong,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  version: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.fg2,
    fontVariant: ['tabular-nums'],
  },
  badge: {
    marginTop: 4,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentSoftBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fontFamily.sansSemi,
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentPress,
  },
});

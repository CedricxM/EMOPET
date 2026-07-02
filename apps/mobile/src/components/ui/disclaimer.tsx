/**
 * Disclaimer — prudence bandeau ("EMOPET n'est pas un avis clinique…").
 * Sticks under any health-adjacent content per voice rules.
 */

import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../../theme';
import { Icon } from './icon';

const DEFAULT_MESSAGE =
  "EMOPET fournit des observations et tendances. Ce n'est pas un avis clinique et cela ne remplace pas l'avis d'un vétérinaire.";

interface Props {
  message?: string;
}

export function Disclaimer({ message = DEFAULT_MESSAGE }: Props) {
  return (
    <View style={styles.wrap}>
      <Icon name="info" size={14} color={colors.prudence.ink} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: spacing.s2,
    alignItems: 'flex-start',
    backgroundColor: colors.prudence.bg,
    borderWidth: 1,
    borderColor: colors.prudence.border,
    borderRadius: radius.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  text: {
    flex: 1,
    marginTop: 1,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs - 0.5,
    color: colors.prudence.ink,
    lineHeight: 16,
  },
});

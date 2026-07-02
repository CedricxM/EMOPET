import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  Caption,
  H1,
  Icon,
  P2,
  ScreenContainer,
} from '../../src/components/ui';
import { colors, fontFamily, fontSize, spacing } from '../../src/theme';

interface Entry {
  date: string;
  kind: string;
  text: string;
}

const ENTRIES: Entry[] = [
  { date: 'Hier · 21 h', kind: 'Contexte', text: 'Orage en soirée — fenêtres fermées.' },
  { date: 'Mar. 10 avr.', kind: 'Promenade', text: 'Plage de Gâvres, 45 min, vent soutenu.' },
  { date: 'Lun. 9 avr.', kind: 'Visite', text: 'Invités · deux enfants bruyants.' },
  { date: 'Dim. 8 avr.', kind: 'Routine', text: 'Journée calme à la maison.' },
];

export default function JournalScreen() {
  return (
    <ScreenContainer scroll>
      <H1>Journal</H1>
      <P2 style={styles.intro}>
        Événements déclarés par vous — servent à contextualiser les tendances observées.
      </P2>

      <Button kind="secondary" style={styles.addBtn}>
        <View style={styles.addInner}>
          <Icon name="plus" size={14} color={colors.fgStrong} />
          <Text style={styles.addLabel}>Ajouter un événement</Text>
        </View>
      </Button>

      <View style={styles.list}>
        {ENTRIES.map((e, i) => (
          <Card key={i} padding={14} bordered>
            <View style={styles.entryHeader}>
              <Text style={styles.entryKind}>{e.kind}</Text>
              <Caption style={styles.entryDate}>{e.date}</Caption>
            </View>
            <Text style={styles.entryText}>{e.text}</Text>
          </Card>
        ))}
      </View>

      <Caption style={styles.footnote}>
        Évitez toute donnée personnelle (adresse, nom d’enfant, numéro).
      </Caption>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: 4,
    marginBottom: spacing.s4,
  },
  addBtn: {
    alignSelf: 'flex-start',
  },
  addInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addLabel: {
    fontFamily: fontFamily.sansSemi,
    fontSize: fontSize.sm + 1,
    fontWeight: '600',
    color: colors.fgStrong,
  },
  list: {
    marginTop: spacing.s4,
    gap: spacing.s3,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  entryKind: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.accent2,
  },
  entryDate: {
    fontVariant: ['tabular-nums'],
  },
  entryText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.fg,
    marginTop: 6,
    lineHeight: 21,
  },
  footnote: {
    marginTop: spacing.s5,
    textAlign: 'center',
    paddingHorizontal: spacing.s4,
  },
});

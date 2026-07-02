import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Caption, H1, Icon, P2, ScreenContainer } from '../../src/components/ui';
import { colors, fontFamily, fontSize, palette, radius, spacing } from '../../src/theme';

type Accent = 'lichen' | 'terracotta';

interface Item {
  kind: string;
  name: string;
  dist: string;
  detail: string;
  accent: Accent;
}

const ITEMS: Item[] = [
  {
    kind: 'Vétérinaire · Lorient',
    name: 'Clinique du Faouëdic',
    dist: '1,2 km',
    detail: 'Consultations comportementales',
    accent: 'lichen',
  },
  {
    kind: 'Comportementaliste · Quimper',
    name: 'Anna Le Goff',
    dist: '4,6 km',
    detail: 'Travail sur séparation sereine',
    accent: 'terracotta',
  },
  {
    kind: 'Parc canin · Larmor-Plage',
    name: 'Parc de Toulhars',
    dist: '3,8 km',
    detail: 'Plage autorisée hors saison',
    accent: 'lichen',
  },
  {
    kind: 'Éducateur · Vannes',
    name: 'Ker-Dog',
    dist: '8,1 km',
    detail: 'Sessions individuelles',
    accent: 'terracotta',
  },
];

const FILTERS = ['Tous', 'Vétérinaires', 'Parcs', 'Éducateurs', 'Urgences'];

export default function LocalScreen() {
  const [filter, setFilter] = useState(0);

  return (
    <ScreenContainer scroll>
      <H1>Local</H1>
      <P2 style={styles.intro}>
        Annuaire Bretagne — vétérinaires, comportementalistes, parcs. Zones larges, pas de carte publique.
      </P2>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={styles.filtersScroll}
      >
        {FILTERS.map((f, i) => {
          const active = i === filter;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(i)}
              style={[
                styles.filterChip,
                active ? styles.filterChipActive : styles.filterChipInactive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? colors.bgAlt : colors.fg },
                ]}
              >
                {f}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.list}>
        {ITEMS.map((it) => {
          const isLichen = it.accent === 'lichen';
          const softBg = isLichen ? colors.accent2Soft : colors.accentSoft;
          const softBorder = isLichen ? colors.accent2SoftBorder : colors.accentSoftBorder;
          const accentInk = isLichen ? palette.lichen[700] : palette.terracotta[700];
          return (
            <Card key={it.name} padding={14} bordered onPress={() => {}}>
              <View style={styles.itemRow}>
                <View style={[styles.iconBadge, { backgroundColor: softBg, borderColor: softBorder }]}>
                  <Icon name="compass" size={22} color={accentInk} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={[styles.itemKind, { color: accentInk }]}>{it.kind}</Text>
                  <Text style={styles.itemName}>{it.name}</Text>
                  <Caption style={styles.itemDetail}>
                    {it.dist} · {it.detail}
                  </Caption>
                </View>
                <Icon name="chevron" size={16} color={colors.fgHint} />
              </View>
            </Card>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: 4,
    marginBottom: spacing.s4,
  },
  filtersScroll: {
    marginBottom: spacing.s4,
    flexGrow: 0,
  },
  filtersRow: {
    gap: 6,
    paddingRight: spacing.s4,
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: colors.fgStrong,
    borderColor: colors.fgStrong,
  },
  filterChipInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  filterText: {
    fontFamily: fontFamily.sansSemi,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  list: {
    gap: spacing.s3,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemKind: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  itemName: {
    fontFamily: fontFamily.serif,
    fontSize: 16,
    fontWeight: '600',
    color: colors.fgStrong,
    marginTop: 2,
    marginBottom: 4,
  },
  itemDetail: {
    fontVariant: ['tabular-nums'],
  },
});

// EMOPET · TrendsScreen — React Native port
// Sub-screen from Home (ELI card tap). 3-source rule pedagogical surface.

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { T } from '@/tokens';
import { Card, Pill, Eyebrow, Disclaimer } from '@/ui/primitives';
import { Icon } from '@/ui/Icon';
import { Sparkline } from '@/components/Sparkline';
import { TRENDS_14D, EVENT_COLORS, EVENT_LABELS } from '@/data/trendsData';
import { useStaggeredReveal, useRevealOnMount } from '@/animations/motion';

// ─── Selected day detail (3-source breakdown) ──────────────────────
function SelectedDayDetail({ dayOffset }: { dayOffset: number }) {
  const day =
    TRENDS_14D.find((d) => d.dayOffset === dayOffset) ??
    TRENDS_14D[TRENDS_14D.length - 1];
  const style = useRevealOnMount({ duration: 220 });
  if (!day) return null;
  const hasEvents = day.events.length > 0;
  const hasInterpretation = !!day.interpretation;

  return (
    <Animated.View style={style} key={dayOffset}>
      <Card style={{ marginBottom: 14 }}>
        <View style={styles.rowBetween}>
          <Pill state={day.state} />
          <Text style={styles.metaRight}>
            {day.dayOffset === 0 ? "Aujourd'hui" : day.dateLabel}
          </Text>
        </View>
        <Eyebrow>Charge · jour sélectionné</Eyebrow>
        <View style={styles.valueRow}>
          {day.eli === null ? (
            <Text style={styles.valueSuppressed}>— —</Text>
          ) : (
            <Text style={styles.valueMedium}>
              {day.eli.toFixed(2).replace('.', ',')}
            </Text>
          )}
          <Text style={styles.valueUnit}>ELI</Text>
        </View>
        <Text style={styles.validHoursText}>
          {day.validHours > 0
            ? `Signal valide : ${day.validHours.toFixed(1).replace('.', ',')} h sur 24`
            : 'Aucun signal valide ce jour-là.'}
        </Text>
      </Card>

      {/* Three-source breakdown */}
      <View style={{ gap: 10 }}>
        {/* Observé */}
        <View style={styles.sourceCard}>
          <View style={styles.sourceHead}>
            <View style={[styles.sourceDot, { backgroundColor: T.colors.fg2 }]} />
            <Text style={[styles.sourceLabel, { color: T.colors.fg2 }]}>Observé</Text>
          </View>
          <Text style={styles.sourceText}>{day.observed}</Text>
        </View>

        {/* Déclaré */}
        <View
          style={[
            styles.sourceCard,
            hasEvents
              ? { backgroundColor: T.colors.terracotta[100], borderColor: '#E5B29D' }
              : null,
          ]}
        >
          <View style={styles.sourceHead}>
            <View style={[styles.sourceDot, { backgroundColor: hasEvents ? T.colors.terracotta[600] : T.colors.fgHint }]} />
            <Text style={[styles.sourceLabel, { color: hasEvents ? T.colors.terracotta[700] : T.colors.fgHint }]}>
              Déclaré
            </Text>
          </View>
          {!hasEvents ? (
            <Text style={styles.sourceMuted}>Aucun événement déclaré.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {day.events.map((ev, i) => (
                <View key={i} style={styles.eventRow}>
                  <View style={[styles.eventDot, { backgroundColor: EVENT_COLORS[ev.kind] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventKind}>{EVENT_LABELS[ev.kind]}</Text>
                    <Text style={styles.eventText}>{ev.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Interprétation */}
        <View
          style={[
            styles.sourceCard,
            hasInterpretation
              ? { backgroundColor: T.colors.accent2Soft, borderColor: T.colors.lichen[200] }
              : null,
          ]}
        >
          <View style={styles.sourceHead}>
            <View style={[styles.sourceDot, { backgroundColor: hasInterpretation ? T.colors.lichen[700] : T.colors.fgHint }]} />
            <Text style={[styles.sourceLabel, { color: hasInterpretation ? T.colors.lichen[700] : T.colors.fgHint }]}>
              Interprétation
            </Text>
          </View>
          {hasInterpretation ? (
            <Text style={styles.sourceText}>{day.interpretation}</Text>
          ) : (
            <Text style={styles.sourceMuted}>Rien à signaler — baseline stable.</Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export function TrendsScreen({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState(0); // today
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width - 32 - 24, 370); // screen padding + card padding

  const headerStyle = useStaggeredReveal(0);
  const summaryStyle = useStaggeredReveal(1);
  const chartStyle = useStaggeredReveal(2);
  const captionStyle = useStaggeredReveal(3);

  const summary = {
    daysValid: TRENDS_14D.filter((d) => d.state === 'valid').length,
    daysDegraded: TRENDS_14D.filter((d) => d.state === 'degraded').length,
    daysSuppressed: TRENDS_14D.filter((d) => d.state === 'suppressed').length,
    eventsCount: TRENDS_14D.reduce((acc, d) => acc + d.events.length, 0),
    eliAvg:
      TRENDS_14D.filter((d) => d.eli !== null).reduce((a, d) => a + (d.eli as number), 0) /
      TRENDS_14D.filter((d) => d.eli !== null).length,
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Header with back */}
      <Animated.View style={[styles.header, headerStyle]}>
        <Pressable onPress={onBack} style={styles.backBtn} accessibilityLabel="Retour">
          <Icon name="chevronLeft" size={14} color={T.colors.fgStrong} />
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>Gwen</Text>
          <Text style={styles.h1}>Tendances</Text>
        </View>
      </Animated.View>

      {/* Summary row */}
      <Animated.View style={[styles.summaryRow, summaryStyle]}>
        {[
          { k: 'Moyen', v: summary.eliAvg.toFixed(2).replace('.', ','), c: T.colors.fgStrong },
          { k: 'Valid', v: summary.daysValid + ' j', c: T.colors.eliValidInk },
          { k: 'Degr.', v: summary.daysDegraded + ' j', c: T.colors.eliDegradedInk },
          { k: 'Suppr.', v: summary.daysSuppressed + ' j', c: T.colors.eliSuppressedInk },
        ].map((it) => (
          <View key={it.k} style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>{it.k}</Text>
            <Text style={[styles.summaryValue, { color: it.c }]}>{it.v}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Chart card */}
      <Animated.View style={chartStyle}>
        <Card style={[styles.mb14, { padding: 12 }]}>
          <View style={styles.chartHeader}>
            <Eyebrow style={{ marginBottom: 0 }}>Charge ELI · 14 j</Eyebrow>
            <Text style={styles.chartHeaderRight}>{summary.eventsCount} événements</Text>
          </View>

          <Sparkline data={TRENDS_14D} selected={selected} onSelect={setSelected} width={chartWidth} />

          {/* Legend */}
          <View style={styles.legend}>
            {[
              ['Valid', T.colors.eliValid],
              ['Degraded', T.colors.eliDegraded],
              ['Suppressed', T.colors.eliSuppressed],
            ].map(([k, c]) => (
              <View key={k as string} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: c as string }]} />
                <Text style={styles.legendText}>{k}</Text>
              </View>
            ))}
            <View style={[styles.legendItem, { marginLeft: 'auto' }]}>
              <View style={[styles.legendTinyDot, { backgroundColor: T.colors.accent }]} />
              <View style={[styles.legendTinyDot, { backgroundColor: T.colors.accent2 }]} />
              <View style={[styles.legendTinyDot, { backgroundColor: T.colors.eliDegraded }]} />
              <Text style={[styles.legendText, { marginLeft: 5 }]}>Événements</Text>
            </View>
          </View>

          <Text style={styles.chartCaption}>
            Touchez un point pour voir le détail du jour. Les jours{' '}
            <Text style={{ fontStyle: 'italic' }}>Suppressed</Text> (cercles pointillés) n'ont pas de valeur : signal insuffisant.
          </Text>
        </Card>
      </Animated.View>

      {/* Selected day detail */}
      <SelectedDayDetail dayOffset={selected} />

      {/* Pedagogical caption */}
      <Animated.View style={[captionStyle, { padding: 14, marginTop: 4 }]}>
        <Text style={styles.peda}>
          Chaque jour combine trois sources :{' '}
          <Text style={styles.pedaStrong}>observé</Text> (capteurs),{' '}
          <Text style={styles.pedaStrong}>déclaré</Text> (vos événements),{' '}
          <Text style={styles.pedaStrong}>interprétation</Text> (EMOPET). Une charge élevée n'est jamais lue seule — toujours avec son contexte.
        </Text>
      </Animated.View>

      <View style={{ marginTop: 4 }}>
        <Disclaimer />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 },
  header: {
    paddingTop: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: T.fonts.sans,
    fontSize: 12,
    color: T.colors.fgMuted,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    fontWeight: T.type.wSemi,
  },
  h1: {
    fontFamily: T.fonts.serif,
    fontWeight: T.type.wSemi,
    fontSize: 26,
    color: T.colors.fgStrong,
    marginTop: 2,
    letterSpacing: -0.26,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  summaryCell: {
    flex: 1,
    backgroundColor: T.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.border,
    borderRadius: T.radii.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: T.fonts.sans,
    fontSize: 9,
    color: T.colors.fgMuted,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontWeight: T.type.wBold,
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: T.fonts.serif,
    fontWeight: T.type.wMedium,
    fontSize: 16,
    fontVariant: T.type.tabular,
  },

  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  chartHeaderRight: {
    fontFamily: T.fonts.sans,
    fontSize: 10,
    color: T.colors.fgMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: T.type.wSemi,
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendTinyDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 2,
  },
  legendText: {
    fontFamily: T.fonts.sans,
    fontSize: 10,
    color: T.colors.fgMuted,
    fontWeight: T.type.wSemi,
    letterSpacing: 0.4,
  },
  chartCaption: {
    fontFamily: T.fonts.sans,
    fontSize: 11.5,
    color: T.colors.fgMuted,
    marginTop: 10,
    lineHeight: 17,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.colors.border,
    borderStyle: 'dashed',
    paddingTop: 10,
    paddingHorizontal: 4,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaRight: {
    fontFamily: T.fonts.sans,
    fontSize: 11,
    color: T.colors.fgMuted,
    letterSpacing: 0.44,
    fontVariant: T.type.tabular,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  valueMedium: {
    fontFamily: T.fonts.serif,
    fontWeight: T.type.wMedium,
    fontSize: 40,
    letterSpacing: -0.8,
    color: T.colors.fgStrong,
    fontVariant: T.type.tabular,
  },
  valueSuppressed: {
    fontFamily: T.fonts.serif,
    fontWeight: T.type.wRegular,
    fontSize: 32,
    color: T.colors.fgMuted,
    fontStyle: 'italic',
  },
  valueUnit: {
    fontFamily: T.fonts.sans,
    fontSize: 13,
    color: T.colors.fgMuted,
    letterSpacing: 0.52,
  },
  validHoursText: {
    fontFamily: T.fonts.sans,
    fontSize: 12,
    color: T.colors.fg2,
    marginTop: 8,
    lineHeight: 18,
  },

  sourceCard: {
    backgroundColor: T.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.border,
    borderRadius: T.radii.lg,
    padding: 14,
  },
  sourceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sourceLabel: {
    fontFamily: T.fonts.sans,
    fontSize: 10.5,
    fontWeight: T.type.wBold,
    letterSpacing: 1.26,
    textTransform: 'uppercase',
  },
  sourceText: {
    fontFamily: T.fonts.sans,
    fontSize: 13,
    color: T.colors.fg,
    lineHeight: 19.5,
    fontVariant: T.type.tabular,
  },
  sourceMuted: {
    fontFamily: T.fonts.sans,
    fontSize: 13,
    color: T.colors.fgMuted,
    fontStyle: 'italic',
  },
  eventRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  eventKind: {
    fontFamily: T.fonts.sans,
    fontSize: 10,
    fontWeight: T.type.wBold,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    color: T.colors.fg2,
    marginBottom: 2,
  },
  eventText: {
    fontFamily: T.fonts.sans,
    fontSize: 13,
    color: T.colors.fg,
    lineHeight: 19,
  },

  peda: {
    fontFamily: T.fonts.serif,
    fontSize: 12,
    color: T.colors.fg2,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  pedaStrong: {
    fontStyle: 'normal',
    fontWeight: T.type.wSemi,
  },

  mb14: { marginBottom: 14 },
});

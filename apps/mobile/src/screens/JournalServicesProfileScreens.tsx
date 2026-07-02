// EMOPET · Journal + Services + Profile — React Native port
// 3 écrans compacts groupés ici pour concision.

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { T } from '@/tokens';
import { Card, Button, Eyebrow } from '@/ui/primitives';
import { Icon } from '@/ui/Icon';
import { useStaggeredReveal } from '@/animations/motion';

// ═══════════════════════════════════════════════════════════════════
// JOURNAL
// ═══════════════════════════════════════════════════════════════════

const JOURNAL_ENTRIES = [
  { date: 'Hier · 21 h', kind: 'Contexte', text: 'Orage en soirée — fenêtres fermées.' },
  { date: 'Mar. 10 avr.', kind: 'Promenade', text: 'Plage de Gâvres, 45 min, vent soutenu.' },
  { date: 'Lun. 9 avr.', kind: 'Visite', text: 'Invités · deux enfants bruyants.' },
  { date: 'Dim. 8 avr.', kind: 'Routine', text: 'Journée calme à la maison.' },
];

export function JournalScreen({ variant = 'normal' }: { variant?: 'normal' | 'empty' }) {
  const h1Style = useStaggeredReveal(0);
  const subtitleStyle = useStaggeredReveal(1);
  const buttonStyle = useStaggeredReveal(2);
  const emptyStyle = useStaggeredReveal(3);
  const captionStyle = useStaggeredReveal(4);
  const entries = variant === 'empty' ? [] : JOURNAL_ENTRIES;

  return (
    <ScrollView contentContainerStyle={journalStyles.scroll} showsVerticalScrollIndicator={false}>
      <Animated.View style={h1Style}>
        <Text style={journalStyles.h1}>Journal</Text>
      </Animated.View>
      <Animated.View style={subtitleStyle}>
        <Text style={journalStyles.subtitle}>
          Événements déclarés par vous — servent à contextualiser les tendances observées.
        </Text>
      </Animated.View>

      <Animated.View style={buttonStyle}>
        <Button kind="secondary" leadingIcon={<Icon name="plus" size={14} color={T.colors.fgStrong} />}>
          Ajouter un événement
        </Button>
      </Animated.View>

      {entries.length === 0 ? (
        <Animated.View style={[journalStyles.emptyCard, emptyStyle]}>
          <View style={journalStyles.emptyIcon}>
            <Icon name="empty" size={32} color={T.colors.fgHint} />
          </View>
          <Text style={journalStyles.emptyTitle}>Aucun événement pour le moment</Text>
          <Text style={journalStyles.emptyText}>
            Un orage, une visite, une promenade inhabituelle — tout contexte déclaré aide EMOPET à interpréter les tendances observées.
          </Text>
        </Animated.View>
      ) : (
        <View style={{ marginTop: 14, gap: 10 }}>
          {entries.map((e, i) => (
            <Card key={i} pad={14}>
              <View style={journalStyles.entryHead}>
                <Text style={journalStyles.entryKind}>{e.kind}</Text>
                <Text style={journalStyles.entryDate}>{e.date}</Text>
              </View>
              <Text style={journalStyles.entryText}>{e.text}</Text>
            </Card>
          ))}
        </View>
      )}

      <Animated.View style={captionStyle}>
        <Text style={journalStyles.caption}>
          Évitez toute donnée personnelle (adresse, nom d'enfant, numéro).
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const journalStyles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  h1: {
    fontFamily: T.fonts.serif,
    fontWeight: T.type.wSemi,
    fontSize: 32,
    color: T.colors.fgStrong,
    marginTop: 4,
    marginBottom: 6,
    letterSpacing: -0.32,
  },
  subtitle: {
    fontFamily: T.fonts.sans,
    fontSize: 13,
    color: T.colors.fg2,
    marginBottom: 14,
    lineHeight: 19.5,
  },
  emptyCard: {
    marginTop: 24,
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: T.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: T.colors.border,
    borderRadius: T.radii.lg,
    alignItems: 'center',
  },
  emptyIcon: { marginBottom: 14 },
  emptyTitle: {
    fontFamily: T.fonts.serif,
    fontSize: 18,
    fontWeight: T.type.wMedium,
    color: T.colors.fgStrong,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: T.fonts.sans,
    fontSize: 13,
    color: T.colors.fg2,
    lineHeight: 20,
    maxWidth: 260,
    textAlign: 'center',
  },
  entryHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  entryKind: {
    fontFamily: T.fonts.sans,
    fontSize: 10.5,
    fontWeight: T.type.wBold,
    letterSpacing: 1.26,
    textTransform: 'uppercase',
    color: T.colors.accent2,
  },
  entryDate: {
    fontFamily: T.fonts.sans,
    fontSize: 11,
    color: T.colors.fgMuted,
    fontVariant: T.type.tabular,
  },
  entryText: {
    fontFamily: T.fonts.sans,
    fontSize: 14,
    color: T.colors.fg,
    marginTop: 6,
    lineHeight: 21,
  },
  caption: {
    marginTop: 18,
    fontFamily: T.fonts.sans,
    fontSize: 11,
    color: T.colors.fgMuted,
    lineHeight: 16,
    textAlign: 'center',
  },
});

// ═══════════════════════════════════════════════════════════════════
// SERVICES / LOCAL
// ═══════════════════════════════════════════════════════════════════

const SERVICES_DATA = [
  { kind: 'Vétérinaire · Lorient', name: 'Clinique du Faouëdic', dist: '1,2 km', detail: 'Consultations comportementales', accent: 'lichen' as const, filter: 'veto' },
  { kind: 'Comportementaliste · Quimper', name: 'Anna Le Goff', dist: '4,6 km', detail: 'Travail sur séparation sereine', accent: 'terracotta' as const, filter: 'educator' },
  { kind: 'Parc canin · Larmor-Plage', name: 'Parc de Toulhars', dist: '3,8 km', detail: 'Plage autorisée hors saison', accent: 'lichen' as const, filter: 'park' },
  { kind: 'Éducateur · Vannes', name: 'Ker-Dog', dist: '8,1 km', detail: 'Sessions individuelles', accent: 'terracotta' as const, filter: 'educator' },
];

export function ServicesScreen({ variant = 'normal' }: { variant?: 'normal' | 'empty' }) {
  const [filter, setFilter] = useState<string>(variant === 'empty' ? 'urgence' : 'all');
  const h1Style = useStaggeredReveal(0);
  const subtitleStyle = useStaggeredReveal(1);
  const filtersStyle = useStaggeredReveal(2);

  const filters = [
    { id: 'all', label: 'Tous' },
    { id: 'veto', label: 'Vétérinaires' },
    { id: 'park', label: 'Parcs' },
    { id: 'educator', label: 'Éducateurs' },
    { id: 'urgence', label: 'Urgences' },
  ];

  const items =
    filter === 'all'
      ? SERVICES_DATA
      : SERVICES_DATA.filter((s) => s.filter === filter);

  return (
    <ScrollView contentContainerStyle={servicesStyles.scroll} showsVerticalScrollIndicator={false}>
      <Animated.View style={h1Style}>
        <Text style={servicesStyles.h1}>Local</Text>
      </Animated.View>
      <Animated.View style={subtitleStyle}>
        <Text style={servicesStyles.subtitle}>
          Annuaire Bretagne — vétérinaires, comportementalistes, parcs. Zones larges, pas de carte publique.
        </Text>
      </Animated.View>

      <Animated.View style={filtersStyle}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 14 }}>
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={[
                  servicesStyles.filterChip,
                  {
                    backgroundColor: active ? T.colors.fgStrong : T.colors.surface,
                    borderColor: active ? T.colors.fgStrong : T.colors.borderStrong,
                  },
                ]}
              >
                <Text style={{
                  fontFamily: T.fonts.sans,
                  fontSize: 12,
                  fontWeight: T.type.wSemi,
                  color: active ? T.colors.cream[50] : T.colors.fg,
                }}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      {items.length === 0 ? (
        <View style={servicesStyles.emptyCard}>
          <View style={{ marginBottom: 14 }}>
            <Icon name="empty" size={32} color={T.colors.fgHint} />
          </View>
          <Text style={servicesStyles.emptyTitle}>Aucun résultat dans cette catégorie</Text>
          <Text style={servicesStyles.emptyText}>
            L'annuaire est en cours d'enrichissement. En cas d'urgence, contactez votre vétérinaire ou le 3115.
          </Text>
          <View style={{ marginTop: 18 }}>
            <Button kind="secondary" small onPress={() => setFilter('all')}>
              Voir tous les services
            </Button>
          </View>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {items.map((it, i) => (
            <Card key={i} pad={14}>
              <View style={servicesStyles.itemRow}>
                <View
                  style={[
                    servicesStyles.itemIcon,
                    {
                      backgroundColor: it.accent === 'lichen' ? T.colors.lichen[100] : T.colors.terracotta[100],
                      borderColor: it.accent === 'lichen' ? T.colors.lichen[200] : T.colors.terracotta[200],
                    },
                  ]}
                >
                  <Icon name="compass" size={22} color={it.accent === 'lichen' ? T.colors.lichen[700] : T.colors.terracotta[700]} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[
                    servicesStyles.itemKind,
                    { color: it.accent === 'lichen' ? T.colors.lichen[700] : T.colors.terracotta[700] },
                  ]}>
                    {it.kind}
                  </Text>
                  <Text style={servicesStyles.itemName}>{it.name}</Text>
                  <Text style={servicesStyles.itemDetail}>{it.dist} · {it.detail}</Text>
                </View>
                <Icon name="chevron" size={16} color={T.colors.fgHint} />
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const servicesStyles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  h1: {
    fontFamily: T.fonts.serif,
    fontWeight: T.type.wSemi,
    fontSize: 32,
    color: T.colors.fgStrong,
    marginTop: 4,
    marginBottom: 6,
    letterSpacing: -0.32,
  },
  subtitle: {
    fontFamily: T.fonts.sans,
    fontSize: 13,
    color: T.colors.fg2,
    marginBottom: 14,
    lineHeight: 19.5,
  },
  filterChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: T.radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemKind: {
    fontFamily: T.fonts.sans,
    fontSize: 10.5,
    fontWeight: T.type.wBold,
    letterSpacing: 1.05,
    textTransform: 'uppercase',
  },
  itemName: {
    fontFamily: T.fonts.serif,
    fontSize: 16,
    fontWeight: T.type.wSemi,
    color: T.colors.fgStrong,
    marginTop: 2,
    marginBottom: 4,
  },
  itemDetail: {
    fontFamily: T.fonts.sans,
    fontSize: 12,
    color: T.colors.fgMuted,
    fontVariant: T.type.tabular,
  },
  emptyCard: {
    marginTop: 12,
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: T.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: T.colors.border,
    borderRadius: T.radii.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: T.fonts.serif,
    fontSize: 18,
    fontWeight: T.type.wMedium,
    color: T.colors.fgStrong,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: T.fonts.sans,
    fontSize: 13,
    color: T.colors.fg2,
    lineHeight: 20,
    maxWidth: 260,
    textAlign: 'center',
  },
});

// ═══════════════════════════════════════════════════════════════════
// PROFILE / MOI
// ═══════════════════════════════════════════════════════════════════

export function ProfileScreen() {
  const h1Style = useStaggeredReveal(0);
  const dogStyle = useStaggeredReveal(1);
  const sensorsEyebrowStyle = useStaggeredReveal(2);
  const matStyle = useStaggeredReveal(3);
  const tagStyle = useStaggeredReveal(4);
  const bannerStyle = useStaggeredReveal(5);
  const paramsEyebrowStyle = useStaggeredReveal(6);
  const paramsCardStyle = useStaggeredReveal(7);

  const settings = [
    { name: 'IA & tonalité', hint: 'Voix Breiz · calme' },
    { name: 'Mode prudence', hint: 'Activé' },
    { name: 'Suivi vétérinaire & vétérinaire', hint: 'Rapport 14 j' },
    { name: 'Confidentialité', hint: 'Pseudonymes · opt-in' },
    { name: "À propos d'EMOPET", hint: null },
  ];

  return (
    <ScrollView contentContainerStyle={profileStyles.scroll} showsVerticalScrollIndicator={false}>
      <Animated.View style={h1Style}>
        <Text style={profileStyles.h1}>Mon profil</Text>
      </Animated.View>

      <Animated.View style={dogStyle}>
        <Card style={profileStyles.mb14} pad={14}>
          <View style={profileStyles.dogRow}>
            <View style={profileStyles.avatar}>
              <Text style={profileStyles.avatarText}>G</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={profileStyles.dogName}>Gwen</Text>
              <Text style={profileStyles.dogMeta}>Épagneul breton · 4 ans · 18 kg</Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View style={sensorsEyebrowStyle}>
        <Eyebrow>Capteurs</Eyebrow>
      </Animated.View>

      <View style={{ gap: 8, marginBottom: 18 }}>
        <Animated.View style={matStyle}>
          <Card pad={12}>
            <View style={profileStyles.sensorRow}>
              <View style={profileStyles.sensorIcon}>
                <Icon name="mat" color={T.colors.fg2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={profileStyles.sensorName}>MAT · tapis</Text>
                <Text style={profileStyles.sensorMeta}>Connecté · 98 % présence</Text>
              </View>
              <View style={profileStyles.sensorBars}>
                {[8, 12, 16, 20].map((h, i) => (
                  <View key={i} style={[profileStyles.sensorBar, { height: h, backgroundColor: T.colors.eliValid }]} />
                ))}
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View style={tagStyle}>
          <Card pad={12}>
            <View style={profileStyles.sensorRow}>
              <View style={profileStyles.sensorIcon}>
                <Icon name="tag" color={T.colors.fg2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={profileStyles.sensorName}>TAG · collier</Text>
                <Text style={profileStyles.sensorMeta}>Contact partiel · batterie 42 %</Text>
              </View>
              <View style={profileStyles.sensorBars}>
                <View style={[profileStyles.sensorBar, { height: 8, backgroundColor: T.colors.eliValid }]} />
                <View style={[profileStyles.sensorBar, { height: 12, backgroundColor: T.colors.eliValid }]} />
                <View style={[profileStyles.sensorBar, { height: 16, backgroundColor: T.colors.eliDegraded }]} />
                <View style={[profileStyles.sensorBar, { height: 20, backgroundColor: T.colors.border }]} />
              </View>
            </View>
          </Card>
        </Animated.View>
      </View>

      <Animated.View style={bannerStyle}>
        <Card pad={14} style={[profileStyles.mb14, profileStyles.suppressedBanner]}>
          <View style={profileStyles.suppressedRow}>
            <View style={profileStyles.suppressedIconCircle}>
              <Text style={profileStyles.suppressedIconText}>i</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={profileStyles.suppressedTitle}>Signal insuffisant pour interprétation</Text>
              <Text style={profileStyles.suppressedText}>
                Moins de 30 min de signal valide ces dernières 24 h — on reste prudent.
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View style={paramsEyebrowStyle}>
        <Eyebrow>Paramètres</Eyebrow>
      </Animated.View>

      <Animated.View style={paramsCardStyle}>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          {settings.map((s, i) => (
            <View
              key={s.name}
              style={[
                profileStyles.settingRow,
                i < settings.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={profileStyles.settingName}>{s.name}</Text>
                {s.hint && <Text style={profileStyles.settingHint}>{s.hint}</Text>}
              </View>
              <Icon name="chevron" size={14} color={T.colors.fgHint} />
            </View>
          ))}
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

const profileStyles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  h1: {
    fontFamily: T.fonts.serif,
    fontWeight: T.type.wSemi,
    fontSize: 32,
    color: T.colors.fgStrong,
    marginTop: 4,
    marginBottom: 14,
    letterSpacing: -0.32,
  },
  dogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: T.colors.bgSunk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: T.fonts.serif,
    fontSize: 22,
    fontWeight: T.type.wSemi,
    color: T.colors.fg2,
  },
  dogName: {
    fontFamily: T.fonts.serif,
    fontSize: 18,
    fontWeight: T.type.wSemi,
    color: T.colors.fgStrong,
  },
  dogMeta: {
    fontFamily: T.fonts.sans,
    fontSize: 12,
    color: T.colors.fgMuted,
  },
  sensorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sensorIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.colors.bgSunk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorName: {
    fontFamily: T.fonts.sans,
    fontSize: 14,
    fontWeight: T.type.wSemi,
    color: T.colors.fgStrong,
  },
  sensorMeta: {
    fontFamily: T.fonts.sans,
    fontSize: 12,
    color: T.colors.fgMuted,
    fontVariant: T.type.tabular,
  },
  sensorBars: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'flex-end',
  },
  sensorBar: {
    width: 4,
    borderRadius: 1,
  },

  suppressedBanner: {
    backgroundColor: T.colors.eliSuppressedBg,
    borderColor: '#D6D9DD',
  },
  suppressedRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  suppressedIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: T.colors.eliSuppressed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suppressedIconText: {
    fontFamily: T.fonts.serif,
    fontStyle: 'italic',
    fontWeight: T.type.wSemi,
    fontSize: 14,
    color: '#fff',
  },
  suppressedTitle: {
    fontFamily: T.fonts.sans,
    fontSize: 13,
    fontWeight: T.type.wSemi,
    color: T.colors.eliSuppressedInk,
    marginBottom: 3,
  },
  suppressedText: {
    fontFamily: T.fonts.sans,
    fontSize: 12,
    color: T.colors.eliSuppressedInk,
    opacity: 0.85,
    lineHeight: 18,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingName: {
    fontFamily: T.fonts.sans,
    fontSize: 14,
    color: T.colors.fgStrong,
  },
  settingHint: {
    fontFamily: T.fonts.sans,
    fontSize: 11.5,
    color: T.colors.fgMuted,
    marginTop: 2,
  },

  mb14: { marginBottom: 14 },
});

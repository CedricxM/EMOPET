// EMOPET · ChatScreen (Breiz) — React Native port
// Variants: normal (history) · empty (suggestions)

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { T } from '@/tokens';
import { Eyebrow, Disclaimer } from '@/ui/primitives';
import { Icon } from '@/ui/Icon';
import { useMessageAppear, usePressAnimation } from '@/animations/motion';

type Message = {
  from: 'breiz' | 'user';
  text: string;
  sources?: string;
  disclaimer?: boolean;
};

function BreizAvatar({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Circle cx="18" cy="18" r="18" fill={T.colors.granit[800]} />
      <Circle cx="18" cy="18" r="4" fill={T.colors.accent} />
      <Circle cx="18" cy="18" r="9" fill="none" stroke={T.colors.accent} strokeWidth="1" opacity="0.5" />
      <Circle cx="18" cy="18" r="14" fill="none" stroke={T.colors.accent} strokeWidth="0.8" opacity="0.25" />
    </Svg>
  );
}

function BreizBubble({ m }: { m: Message }) {
  const style = useMessageAppear('left');
  return (
    <Animated.View style={[styles.breizRow, style]}>
      <View style={{ flexShrink: 0, marginTop: 2 }}>
        <BreizAvatar size={28} />
      </View>
      <View style={styles.breizBubble}>
        <Text style={styles.breizText}>{m.text}</Text>
        {m.sources && (
          <View style={styles.sourceRow}>
            <Text style={styles.sourceLabel}>Source</Text>
            <Text style={styles.sourceSep}> · </Text>
            <Text style={styles.sourceText}>{m.sources}</Text>
          </View>
        )}
        {m.disclaimer && (
          <View style={{ marginTop: 8 }}>
            <Disclaimer />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function UserBubble({ m }: { m: Message }) {
  const style = useMessageAppear('right');
  return (
    <Animated.View style={[styles.userBubbleWrap, style]}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{m.text}</Text>
      </View>
    </Animated.View>
  );
}

const SUGGESTIONS = [
  "Quelles activités sont adaptées à un Épagneul breton de 4 ans ?",
  "Comment reconnaître les signes d'inconfort ?",
  "Que faut-il vérifier avant une longue promenade ?",
  "Comment interpréter un changement de routine ?",
];

export function ChatScreen({ variant = 'normal' }: { variant?: 'normal' | 'empty' }) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>(
    variant === 'empty'
      ? [
          {
            from: 'breiz',
            text: "Bonjour. Je reste non-médical et je parle avec prudence. Sans capteur associé, je m'appuie sur ce que vous déclarez et sur le contexte local. Je peux vous aider à comprendre les tendances observées — ou juste à poser des questions.",
            sources: 'Profil · Breiz v6 · tonalité calme · sans capteur',
          },
        ]
      : [
          {
            from: 'breiz',
            text: "Bonjour. Je reste non-médical et je parle avec prudence. Je peux vous aider à comprendre les tendances observées.",
            sources: 'Profil · Breiz v6 · tonalité calme',
          },
          { from: 'user', text: "Pourquoi Gwen est plus agitée le matin ?" },
          {
            from: 'breiz',
            text: "Une anticipation de vos départs a été observée 3 fois ce mois-ci. Tendance à confirmer — rien d'alarmant pour l'instant.",
            sources: 'MAT · 3 fenêtres matinales · signal valide 2 h 40',
          },
          { from: 'user', text: "Je devrais m'inquiéter pour son bien-être ?" },
          {
            from: 'breiz',
            text: "Je ne peux pas conclure sur le bien-être global à partir de cette seule observation. Si cela persiste plusieurs semaines, ou s'accompagne d'autres changements (appétit, posture, vocalisations), j'en parlerais à votre vétérinaire.",
            sources: 'Interprétation · à confirmer sur plusieurs semaines',
            disclaimer: true,
          },
        ]
  );

  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    setMessages((m) => [...m, { from: 'user', text: t }]);
    setDraft('');
  };

  const sendAnim = usePressAnimation();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BreizAvatar size={36} />
        <View>
          <Text style={styles.headerTitle}>Breiz</Text>
          <Text style={styles.headerSubtitle}>Tonalité calme · non-médical</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m, i) =>
          m.from === 'breiz' ? <BreizBubble key={i} m={m} /> : <UserBubble key={i} m={m} />
        )}

        {variant === 'empty' && (
          <View style={{ marginTop: 8 }}>
            <Eyebrow color={T.colors.terracotta[700]}>Pour commencer</Eyebrow>
            <View style={{ gap: 8, marginTop: 10 }}>
              {SUGGESTIONS.map((s, i) => (
                <Pressable
                  key={i}
                  onPress={() => setMessages((m) => [...m, { from: 'user', text: s }])}
                  style={styles.suggestion}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Composer */}
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
          placeholder="Posez une question…"
          placeholderTextColor={T.colors.fgHint}
          style={styles.input}
        />
        <Animated.View style={sendAnim.pressStyle}>
          <Pressable
            onPress={send}
            onPressIn={sendAnim.onPressIn}
            onPressOut={sendAnim.onPressOut}
            style={styles.sendBtn}
          >
            <Icon name="send" size={16} color="#fff" />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.colors.bg },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontFamily: T.fonts.serif,
    fontSize: 17,
    fontWeight: T.type.wSemi,
    color: T.colors.fgStrong,
  },
  headerSubtitle: {
    fontFamily: T.fonts.sans,
    fontSize: 11,
    color: T.colors.accent2,
    fontWeight: T.type.wSemi,
    letterSpacing: 0.44,
  },
  messagesScroll: { flex: 1 },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },

  breizRow: {
    flexDirection: 'row',
    gap: 10,
    maxWidth: '88%',
  },
  breizBubble: {
    backgroundColor: T.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.border,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexShrink: 1,
    ...T.shadow.sm,
  },
  breizText: {
    fontFamily: T.fonts.sans,
    fontSize: 14,
    color: T.colors.fg,
    lineHeight: 21,
  },
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.colors.border,
    borderStyle: 'dashed',
    paddingTop: 6,
  },
  sourceLabel: {
    fontFamily: T.fonts.sans,
    fontSize: 10.5,
    fontWeight: T.type.wSemi,
    color: T.colors.fg2,
    fontVariant: T.type.tabular,
  },
  sourceSep: { fontSize: 10.5, color: T.colors.fgMuted },
  sourceText: {
    fontFamily: T.fonts.sans,
    fontSize: 10.5,
    color: T.colors.fgMuted,
    fontVariant: T.type.tabular,
  },

  userBubbleWrap: { alignSelf: 'flex-end', maxWidth: '82%' },
  userBubble: {
    backgroundColor: T.colors.accentSoft,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userText: {
    fontFamily: T.fonts.sans,
    fontSize: 14,
    color: T.colors.fgStrong,
  },

  suggestion: {
    backgroundColor: T.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  suggestionText: {
    fontFamily: T.fonts.sans,
    fontSize: 13.5,
    color: T.colors.fgStrong,
    lineHeight: 19.5,
  },

  composer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.colors.border,
    backgroundColor: T.colors.bgAlt,
  },
  input: {
    flex: 1,
    fontFamily: T.fonts.sans,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.borderStrong,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: T.colors.surface,
    color: T.colors.fgStrong,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

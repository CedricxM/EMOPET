import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAiPersona, resolveAiToneProfileEffective } from '@emopet/ai-personality';

import { Icon } from '../../src/components/ui';
import { useDogStore, usePreferencesStore } from '../../src/store';
import { colors, fontFamily, fontSize, radius, spacing } from '../../src/theme';

interface Msg {
  from: 'user' | 'bleiz';
  text: string;
  sources?: string;
}

const SEED: Msg[] = [
  {
    from: 'bleiz',
    text:
      'Bonjour. Je reste non-médical et je parle avec prudence. Je peux vous aider à comprendre les tendances observées.',
    sources: 'Profil · Bleiz · tonalité calme',
  },
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const dogs = useDogStore((s) => s.dogs);
  const communityAiToneProfileDefault = usePreferencesStore(
    (s) => s.communityAiToneProfileDefault,
  );
  const aiToneProfile = usePreferencesStore((s) => s.aiToneProfile);
  const dogName = dogs[0]?.name ?? 'votre chien';
  const persona = getAiPersona(aiToneProfile, {
    dogName,
    locale: 'fr-FR',
    region: 'France',
    communityDefaultProfile: communityAiToneProfileDefault,
  });
  const effective = resolveAiToneProfileEffective(aiToneProfile, communityAiToneProfileDefault);

  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const send = () => {
    const v = draft.trim();
    if (!v) return;
    setMessages((prev) => [...prev, { from: 'user', text: v }]);
    setDraft('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 30);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Icon name="wave" size={22} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{persona.displayName}</Text>
          <Text style={styles.headerMeta}>Tonalité {effective} · non-médical</Text>
        </View>
      </View>

      {/* messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m, i) =>
          m.from === 'bleiz' ? (
            <View key={i} style={styles.bleizRow}>
              <View style={styles.bleizAvatar}>
                <Icon name="wave" size={14} color={colors.accent} />
              </View>
              <View style={styles.bleizBubble}>
                <Text style={styles.bleizText}>{m.text}</Text>
                {m.sources && (
                  <View style={styles.sourcesWrap}>
                    <Text style={styles.sourcesLabel}>Source</Text>
                    <Text style={styles.sourcesValue}>· {m.sources}</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View key={i} style={styles.userRow}>
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{m.text}</Text>
              </View>
            </View>
          ),
        )}
      </ScrollView>

      {/* composer */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.composer,
            { paddingBottom: spacing.s4 + Math.max(0, insets.bottom - 6) },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            placeholder="Posez une question…"
            placeholderTextColor={colors.fgHint}
            style={styles.input}
            returnKeyType="send"
          />
          <Pressable
            onPress={send}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: pressed ? colors.accentPress : colors.accent },
            ]}
          >
            <Icon name="send" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s3,
    paddingBottom: spacing.s3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentSoftBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.fgStrong,
  },
  headerMeta: {
    fontFamily: fontFamily.sansSemi,
    fontSize: fontSize.xxs,
    color: colors.accent2,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s4,
    gap: spacing.s3,
  },
  bleizRow: {
    flexDirection: 'row',
    gap: spacing.s2,
    maxWidth: '88%',
  },
  bleizAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bleizBubble: {
    flexShrink: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderTopLeftRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bleizText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.fg,
    lineHeight: 21,
  },
  sourcesWrap: {
    marginTop: spacing.s2,
    paddingTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: 'dashed' as const,
    gap: 4,
  },
  sourcesLabel: {
    fontFamily: fontFamily.sansSemi,
    fontSize: 10.5,
    color: colors.fg2,
    fontWeight: '600',
  },
  sourcesValue: {
    fontFamily: fontFamily.sans,
    fontSize: 10.5,
    color: colors.fgMuted,
    fontVariant: ['tabular-nums'],
  },
  userRow: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
  },
  userBubble: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    borderBottomRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  userText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.fgStrong,
    lineHeight: 21,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.s2,
    paddingHorizontal: spacing.s3,
    paddingTop: spacing.s3,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgAlt,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.fgStrong,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

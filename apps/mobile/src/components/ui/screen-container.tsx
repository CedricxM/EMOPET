/**
 * ScreenContainer — sets cream bg + consistent gutters + safe-area top.
 * Use either plain (static) or scroll variant.
 */

import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../../theme';

interface Props {
  scroll?: boolean;
  contentStyle?: ViewStyle | ViewStyle[];
  topPadding?: number;
  bottomPadding?: number;
  horizontalPadding?: number;
}

export function ScreenContainer({
  children,
  scroll,
  contentStyle,
  topPadding = spacing.s3,
  bottomPadding = 100,
  horizontalPadding = spacing.s4,
}: PropsWithChildren<Props>) {
  const insets = useSafeAreaInsets();
  const padBody = {
    paddingTop: insets.top + topPadding,
    paddingBottom: bottomPadding,
    paddingHorizontal: horizontalPadding,
  };

  if (scroll) {
    return (
      <ScrollView
        style={styles.bg}
        contentContainerStyle={[padBody, contentStyle as ViewStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.bg, padBody, contentStyle as ViewStyle]}>{children}</View>;
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});

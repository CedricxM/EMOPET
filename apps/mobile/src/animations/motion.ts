// EMOPET · Motion hooks (Reanimated 3)
// 1:1 mapping of anime.js patterns from web v0.4, with DS motion rules:
//   • ease-out cubic-bezier(0.2, 0.7, 0.2, 1)
//   • durations ≤ 360ms
//   • translate ≤ 4px
//   • scale ONLY on press (no scale >1 ever)
//   • no pulse on measurement UI
//   • respect prefers-reduced-motion

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  useSharedValue,
  withTiming,
  withDelay,
  withSequence,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { motion } from '@/tokens';

// ─── Reduced motion detector ───────────────────────────────────────
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      if (mounted) setReduced(v);
    });
    return () => {
      mounted = false;
      // @ts-ignore — RN types vary across versions
      sub?.remove?.();
    };
  }, []);
  return reduced;
}

// ─── Generic fade+translateY reveal on mount ───────────────────────
// Equivalent of anime.js `useRevealOnMount`
// Usage:
//   const style = useRevealOnMount({ delay: 80 });
//   return <Animated.View style={style}>...</Animated.View>
export function useRevealOnMount(opts: { delay?: number; y?: number; duration?: number } = {}) {
  const reduced = useReducedMotion();
  const { delay = 0, y = motion.revealY, duration = motion.dur.slow } = opts;

  const opacity = useSharedValue(reduced ? 1 : 0);
  const translateY = useSharedValue(reduced ? 0 : y);

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: motion.easeOut }));
    translateY.value = withDelay(delay, withTiming(0, { duration, easing: motion.easeOut }));
  }, [reduced]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

// ─── Staggered child reveal ────────────────────────────────────────
// For children that should cascade; pass index to control delay.
// Equivalent of anime.stagger(60, { start: delay })
export function useStaggeredReveal(index: number, opts: { baseDelay?: number; perItem?: number; y?: number } = {}) {
  const { baseDelay = 80, perItem = motion.stagger, y = motion.revealY } = opts;
  return useRevealOnMount({
    delay: baseDelay + index * perItem,
    y,
  });
}

// ─── Message appear (slide from side) ──────────────────────────────
// For Breiz/user chat bubbles. side: 'left' = from left (breiz), 'right' = from right (user)
export function useMessageAppear(side: 'left' | 'right' = 'left') {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 1 : 0);
  const translateX = useSharedValue(reduced ? 0 : (side === 'left' ? -motion.revealX : motion.revealX));

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      translateX.value = 0;
      return;
    }
    opacity.value = withTiming(1, { duration: motion.dur.med, easing: motion.easeOut });
    translateX.value = withTiming(0, { duration: motion.dur.med, easing: motion.easeOut });
  }, [reduced]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));
}

// ─── Count-up numeric value ────────────────────────────────────────
// Returns a string state that animates from 0 → target.
// Use for the ELI value only. Respects decimals and fr-FR (comma separator).
export function useCountUp(
  target: number,
  opts: { decimals?: number; duration?: number; delay?: number } = {}
) {
  const { decimals = 2, duration = 500, delay = 200 } = opts;
  const reduced = useReducedMotion();

  const [display, setDisplay] = useState(
    reduced ? target.toFixed(decimals).replace('.', ',') : (0).toFixed(decimals).replace('.', ',')
  );

  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(target.toFixed(decimals).replace('.', ','));
      return;
    }
    // use a callback tick pattern: timer based, not SharedValue listener
    const startAt = Date.now() + delay;
    const endAt = startAt + duration;

    let frame: ReturnType<typeof requestAnimationFrame> | null = null;
    const tick = () => {
      const now = Date.now();
      if (now < startAt) {
        frame = requestAnimationFrame(tick);
        return;
      }
      if (now >= endAt) {
        setDisplay(target.toFixed(decimals).replace('.', ','));
        return;
      }
      // ease-out
      const t = (now - startAt) / duration;
      const eased = 1 - Math.pow(1 - t, 3);
      const v = eased * target;
      setDisplay(v.toFixed(decimals).replace('.', ','));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target, reduced]);

  return display;
}

// ─── Bar fill (width 0 → pct%) ─────────────────────────────────────
// For the ELI confidence bar. Returns a SharedValue consumed via useAnimatedStyle.
export function useBarFill(targetPct: number, opts: { duration?: number; delay?: number } = {}) {
  const { duration = 500, delay = 200 } = opts;
  const reduced = useReducedMotion();
  const widthPct = useSharedValue(reduced ? targetPct : 0);

  useEffect(() => {
    if (reduced) {
      widthPct.value = targetPct;
      return;
    }
    widthPct.value = withDelay(delay, withTiming(targetPct, { duration, easing: motion.easeOut }));
  }, [targetPct, reduced]);

  return useAnimatedStyle(() => ({
    width: `${widthPct.value}%`,
  }));
}

// ─── Press animation (scale 1 → 0.98 → 1) ──────────────────────────
// Hook returns { pressStyle, onPressIn, onPressOut }.
// The ONLY place `scale` is used in the entire app.
export function usePressAnimation() {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    if (reduced) return;
    scale.value = withTiming(motion.pressScale, { duration: motion.dur.fast, easing: motion.easeOut });
  };
  const onPressOut = () => {
    if (reduced) return;
    scale.value = withTiming(1, { duration: motion.dur.fast, easing: motion.easeOut });
  };

  return { pressStyle, onPressIn, onPressOut };
}

// ─── Tab transition (screen container fade+translateY) ─────────────
// Invoked in the root screen container when the tab changes.
export function useTabTransition(tabKey: string) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    opacity.value = 0;
    translateY.value = motion.revealY;
    opacity.value = withTiming(1, { duration: motion.dur.med, easing: motion.easeOut });
    translateY.value = withTiming(0, { duration: motion.dur.med, easing: motion.easeOut });
  }, [tabKey, reduced]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

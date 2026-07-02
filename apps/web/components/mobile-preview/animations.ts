'use client';

import anime from 'animejs';
import { useEffect, useRef } from 'react';
import { T } from './tokens';

export function reducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Reveal elements with [data-reveal] inside the given container on mount.
 * Fade + 4px translate, staggered by 60ms.
 */
export function useRevealOnMount(active: boolean = true, deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    if (reducedMotion()) return;
    const targets = ref.current.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!targets.length) return;
    anime.set(targets, { opacity: 0, translateY: 4 });
    anime({
      targets,
      opacity: [0, 1],
      translateY: [4, 0],
      duration: T.durSlow,
      easing: 'cubicBezier(0.2,0.7,0.2,1)',
      delay: anime.stagger(60),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ...deps]);
  return ref;
}

/**
 * Tab / screen transition — when key changes, the container fades + slides.
 */
export function useTabTransition(key: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (reducedMotion()) {
      anime.set(ref.current, { opacity: 1, translateY: 0 });
      return;
    }
    anime.set(ref.current, { opacity: 0, translateY: 4 });
    anime({
      targets: ref.current,
      opacity: [0, 1],
      translateY: [4, 0],
      duration: T.durMed,
      easing: 'cubicBezier(0.2,0.7,0.2,1)',
    });
  }, [key]);
  return ref;
}

/**
 * Staggered message appearance in the chat stream.
 */
export function useMessageAppear(active: boolean = true, deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    if (reducedMotion()) return;
    const targets = ref.current.querySelectorAll<HTMLElement>('[data-msg]');
    if (!targets.length) return;
    anime.set(targets, { opacity: 0, translateY: 3 });
    anime({
      targets,
      opacity: [0, 1],
      translateY: [3, 0],
      duration: T.durMed,
      easing: 'cubicBezier(0.2,0.7,0.2,1)',
      delay: anime.stagger(120),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ...deps]);
  return ref;
}

/**
 * Fill an ELI reliability bar from 0 → target width (%).
 */
export function useEliBarFill(percent: number, active: boolean = true) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    if (reducedMotion()) {
      ref.current.style.width = `${percent}%`;
      return;
    }
    anime.set(ref.current, { width: '0%' });
    anime({
      targets: ref.current,
      width: `${percent}%`,
      duration: T.durSlow + 200,
      easing: 'cubicBezier(0.2,0.7,0.2,1)',
      delay: 120,
    });
  }, [percent, active]);
  return ref;
}

/**
 * Count up from 0 → value (integer).
 */
export function useCountUp(value: number, active: boolean = true) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    if (reducedMotion()) {
      ref.current.textContent = String(value);
      return;
    }
    const obj = { n: 0 };
    ref.current.textContent = '0';
    const target = ref.current;
    anime({
      targets: obj,
      n: value,
      round: 1,
      duration: T.durSlow + 140,
      easing: 'cubicBezier(0.2,0.7,0.2,1)',
      update: () => {
        if (target) target.textContent = String(obj.n);
      },
    });
  }, [value, active]);
  return ref;
}

/**
 * Button-press scale feedback.
 */
export function animatePress(el: HTMLElement | null) {
  if (!el) return;
  if (reducedMotion()) return;
  anime.remove(el);
  anime({
    targets: el,
    scale: [1, 0.98, 1],
    duration: T.durFast * 2,
    easing: 'cubicBezier(0.2,0.7,0.2,1)',
  });
}

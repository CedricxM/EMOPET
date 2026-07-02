// EMOPET · Sparkline (react-native-svg port of web v0.4)
// 14-day ELI trend with state-colored dots + event markers + suppressed bridges.
// No libs — custom Catmull-Rom smoothing to maintain visual DNA.

import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Rect, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { T, motion } from '@/tokens';
import { useReducedMotion } from '@/animations/motion';
import { DayPoint, EVENT_COLORS } from '@/data/trendsData';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type SparklineProps = {
  data: DayPoint[];
  width?: number;
  selected: number;                    // dayOffset of selected day
  onSelect: (dayOffset: number) => void;
};

export function Sparkline({ data, width = 370, selected, onSelect }: SparklineProps) {
  const height = 120;
  const padX = 14;
  const padTop = 8;
  const padBottom = 24;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBottom;
  const n = data.length;
  const stepX = chartW / (n - 1);

  // ─── Project points ─────────────────────────────────────────────
  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = d.eli === null ? null : padTop + chartH * (1 - d.eli);
    return { d, x, y, i };
  });

  // ─── Segment across SUPPRESSED gaps ─────────────────────────────
  const segments: Array<Array<typeof points[number]>> = [];
  let current: Array<typeof points[number]> = [];
  for (const p of points) {
    if (p.y === null) {
      if (current.length) { segments.push(current); current = []; }
    } else {
      current.push(p);
    }
  }
  if (current.length) segments.push(current);

  // ─── Catmull-Rom → cubic Bezier ─────────────────────────────────
  const smoothPath = (seg: typeof points) => {
    if (seg.length < 2) return '';
    const s0 = seg[0]!;
    const s1 = seg[1]!;
    if (seg.length === 2) return `M ${s0.x} ${s0.y} L ${s1.x} ${s1.y}`;
    let d = `M ${s0.x} ${s0.y}`;
    for (let i = 0; i < seg.length - 1; i++) {
      const p1 = seg[i]!;
      const p2 = seg[i + 1]!;
      const p0 = seg[i - 1] ?? p1;
      const p3 = seg[i + 2] ?? p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = (p1.y as number) + ((p2.y as number) - (p0.y as number)) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = (p2.y as number) - ((p3.y as number) - (p1.y as number)) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const fillPath = (seg: typeof points) => {
    if (seg.length < 2) return '';
    const first = seg[0]!;
    const last = seg[seg.length - 1]!;
    const line = smoothPath(seg);
    return `${line} L ${last.x} ${padTop + chartH} L ${first.x} ${padTop + chartH} Z`;
  };

  // ─── Animations — line draw + fill fade + dot scale ─────────────
  const reduced = useReducedMotion();
  const drawProgress = useSharedValue(reduced ? 1 : 0);
  const fillOpacity = useSharedValue(reduced ? 0.12 : 0);
  const dotProgress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    drawProgress.value = withTiming(1, { duration: 700, easing: motion.easeOut });
    fillOpacity.value = withDelay(300, withTiming(0.12, { duration: 500, easing: motion.easeOut }));
    dotProgress.value = withDelay(500, withTiming(1, { duration: 400, easing: motion.easeOut }));
  }, []);

  const stateColor = (s: 'valid' | 'degraded' | 'suppressed') =>
    s === 'valid' ? T.colors.eliValid :
    s === 'degraded' ? T.colors.eliDegraded :
    T.colors.eliSuppressed;

  // ─── Animated line props (stroke-dashoffset trick) ──────────────
  // Note: react-native-svg doesn't natively animate strokeDasharray
  // with useAnimatedProps on all platforms for dynamic paths. Workaround:
  // wrap each Path with a pathLength attribute + animate strokeDashoffset.
  // For simplicity here, we fade+scale the lines instead of dash-draw.
  const lineAnimProps = useAnimatedProps(() => ({
    opacity: drawProgress.value,
  }));
  const fillAnimProps = useAnimatedProps(() => ({
    opacity: fillOpacity.value,
  }));

  return (
    <Svg width={width} height={height + 40}>
      {/* Horizontal midline reference */}
      <Line
        x1={padX} y1={padTop + chartH / 2}
        x2={width - padX} y2={padTop + chartH / 2}
        stroke={T.colors.border}
        strokeWidth={1}
        strokeDasharray="2 3"
      />

      {/* Filled area under segments */}
      {segments.map((seg, i) => (
        <AnimatedPath
          key={`fill-${i}`}
          d={fillPath(seg)}
          fill={T.colors.accent2}
          animatedProps={fillAnimProps}
        />
      ))}

      {/* Suppressed bridges (dashed connectors) */}
      {(() => {
        const bridges: React.ReactNode[] = [];
        for (let i = 0; i < n - 1; i++) {
          const a = points[i];
          const b = points[i + 1];
          if (!a || !b) continue;
          if (a.y !== null && b.y === null) {
            let j = i + 1;
            while (j < n && points[j]?.y === null) j++;
            const target = points[j];
            if (j < n && target && target.y !== null) {
              bridges.push(
                <Line
                  key={`bridge-${i}`}
                  x1={a.x} y1={a.y} x2={target.x} y2={target.y as number}
                  stroke={T.colors.eliSuppressed}
                  strokeWidth={1}
                  strokeDasharray="3 4"
                  opacity={0.5}
                />
              );
            }
          }
        }
        return bridges;
      })()}

      {/* Line segments */}
      {segments.map((seg, i) => (
        <AnimatedPath
          key={`line-${i}`}
          d={smoothPath(seg)}
          fill="none"
          stroke={T.colors.granit[700]}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          animatedProps={lineAnimProps}
        />
      ))}

      {/* Points */}
      {points.map((p) => {
        if (p.y === null) return null;
        const isSelected = selected === p.d.dayOffset;
        const r = isSelected ? 5 : 3.2;
        return (
          <G key={`pt-${p.i}`}>
            {isSelected && (
              <Line
                x1={p.x} y1={padTop} x2={p.x} y2={padTop + chartH}
                stroke={T.colors.fgMuted}
                strokeWidth={1}
                strokeDasharray="1 3"
                opacity={0.5}
              />
            )}
            <Circle
              cx={p.x} cy={p.y}
              r={r}
              fill={stateColor(p.d.state)}
              stroke={isSelected ? T.colors.fgStrong : T.colors.surface}
              strokeWidth={isSelected ? 1.5 : 2}
            />
          </G>
        );
      })}

      {/* Suppressed markers (open rings at bottom) */}
      {points.map((p) => {
        if (p.y !== null) return null;
        return (
          <G key={`sup-${p.i}`}>
            <Circle
              cx={p.x} cy={padTop + chartH - 4}
              r={3}
              fill="none"
              stroke={T.colors.eliSuppressed}
              strokeWidth={1.2}
              strokeDasharray="1.5 1.5"
              opacity={selected === p.d.dayOffset ? 1 : 0.6}
            />
            {selected === p.d.dayOffset && (
              <Line
                x1={p.x} y1={padTop} x2={p.x} y2={padTop + chartH}
                stroke={T.colors.fgMuted}
                strokeWidth={1}
                strokeDasharray="1 3"
                opacity={0.5}
              />
            )}
          </G>
        );
      })}

      {/* Day labels */}
      {points.map((p, i) => {
        const showLabel = i === 0 || i === 6 || i === n - 1 || i === Math.floor(n / 2);
        if (!showLabel) return null;
        return (
          <SvgText
            key={`lbl-${i}`}
            x={p.x} y={padTop + chartH + 14}
            textAnchor="middle"
            fontSize="9"
            fontFamily={T.fonts.sans}
            fontWeight="600"
            fill={T.colors.fgMuted}
          >
            {p.d.dateLabel}
          </SvgText>
        );
      })}

      {/* Event markers (colored dots below axis) */}
      {points.map((p, i) => {
        if (p.d.events.length === 0) return null;
        const y = padTop + chartH + 28;
        return (
          <G key={`ev-${i}`}>
            {p.d.events.slice(0, 2).map((ev, j) => (
              <Circle
                key={j}
                cx={p.x - (p.d.events.length > 1 ? 3 - j * 6 : 0)}
                cy={y}
                r={2.2}
                fill={EVENT_COLORS[ev.kind]}
              />
            ))}
          </G>
        );
      })}

      {/* Hit targets — one rect per day, full vertical reach */}
      {points.map((p) => (
        <Rect
          key={`hit-${p.i}`}
          x={p.x - stepX / 2}
          y={0}
          width={stepX}
          height={height + 40}
          fill="transparent"
          onPressIn={() => onSelect(p.d.dayOffset)}
        />
      ))}
    </Svg>
  );
}

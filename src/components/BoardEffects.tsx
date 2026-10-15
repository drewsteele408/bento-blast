// One-shot effects drawn over the board after a move:
//
//   - placed cells bump slightly as they settle
//   - cleared cells pop and fade, rippling out from where the piece landed. The engine has
//     already emptied them, so they're drawn from the `cleared` event's colors.
//   - a floating "+points" popup, a "Combo ×N" banner, and a flash, confetti and banner for a
//     board clear
//
// The parent remounts this per move (key = moves), which starts the animations. A new move
// replaces the effects of the last one straight away, so a piece placed quickly never lands
// under cells that are still fading out. Everything ends invisible, so finished effects can
// stay mounted until then without covering the board's hover preview.
//
// Animations run on the UI thread from shared values; nothing here re-renders while they play.

import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BOARD_SIZE, Cell, ColoredCell, COLOR_COUNT, ColorId, GameEvent } from '@/engine';
import { BoardPoint, CLEAR_STAGGER_MAX_MS, moveEffects } from '@/hooks/moveEffects';
import { colors, colorFor, sizes } from '@/theme';

import { BentoBlock } from './BentoBlock';

/** How long each effect plays. A cleared cell pops in about 250 ms, ripple included. */
export const EFFECT_MS = {
  settle: 200,
  clearCell: 180,
  popup: 850,
  combo: 1000,
  boardClear: 1500,
  flash: 600,
  confetti: 900,
} as const;

const CLEAR_TOTAL_MS = EFFECT_MS.clearCell + CLEAR_STAGGER_MAX_MS;
const CONFETTI_PIECES = 16;

type Props = {
  /** The move's events. Empty (or no placement) draws nothing. */
  events: readonly GameEvent[];
  cellSize: number;
};

function BoardEffectsInner({ events, cellSize }: Props) {
  const fx = moveEffects(events);
  if (!fx) return null;
  const boardSize = cellSize * BOARD_SIZE;

  return (
    <View
      testID="board-effects"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.layer, { width: boardSize, height: boardSize }]}
    >
      {fx.settle.cells.length > 0 && (
        <Settle cells={fx.settle.cells} color={fx.settle.color} cellSize={cellSize} />
      )}
      {fx.cleared.length > 0 && <ClearBurst cells={fx.cleared} cellSize={cellSize} />}
      {fx.boardCleared && <BoardClearCelebration cellSize={cellSize} />}
      {fx.popupAt && <ScorePopup points={fx.points} at={fx.popupAt} cellSize={cellSize} />}
      {fx.combo > 0 && (
        <Banner
          testID="combo-banner"
          text={`Combo ×${fx.combo}`}
          row={fx.comboRow}
          cellSize={cellSize}
          durationMs={EFFECT_MS.combo}
        />
      )}
      {fx.boardCleared && (
        <Banner
          testID="board-clear-banner"
          text="Board clear!"
          row={(BOARD_SIZE - 1) / 2}
          cellSize={cellSize}
          durationMs={EFFECT_MS.boardClear}
          big
        />
      )}
    </View>
  );
}

export const BoardEffects = memo(BoardEffectsInner);

/** A shared value that runs from 0 to 1 once, starting when the component mounts. */
function useOneShot(durationMs: number, easing = Easing.linear): SharedValue<number> {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(1, { duration: durationMs, easing }));
  }, [progress, durationMs, easing]);
  return progress;
}

/** Where a cell's block sits inside the layer, matching the board's cells. */
function blockBox({ row, col }: Cell, cellSize: number) {
  const block = cellSize - sizes.cellGap;
  return {
    left: col * cellSize + sizes.cellGap / 2,
    top: row * cellSize + sizes.cellGap / 2,
    width: block,
    height: block,
  };
}

// --- Settle: placed cells bump up and back, drawn over the board's own copy ---

function Settle({ cells, color, cellSize }: { cells: Cell[]; color: ColorId; cellSize: number }) {
  const progress = useOneShot(EFFECT_MS.settle, Easing.out(Easing.quad));
  return cells.map((cell) => (
    <SettleBlock
      key={`${cell.row}-${cell.col}`}
      cell={cell}
      color={color}
      cellSize={cellSize}
      progress={progress}
    />
  ));
}

type SettleBlockProps = {
  cell: Cell;
  color: ColorId;
  cellSize: number;
  progress: SharedValue<number>;
};

function SettleBlock({ cell, color, cellSize, progress }: SettleBlockProps) {
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    // Never below 1: the board's copy underneath would show around a smaller block. Hidden
    // once done, so it can't cover the hover preview on this cell later.
    return {
      opacity: p < 1 ? 1 : 0,
      transform: [{ scale: interpolate(p, [0, 0.4, 1], [1, 1.1, 1]) }],
    };
  });
  const box = blockBox(cell, cellSize);
  return (
    <Animated.View testID="settle-cell" style={[styles.abs, box, style]}>
      <BentoBlock color={color} size={box.width} />
    </Animated.View>
  );
}

// --- Clear: cleared cells flash, swell and shrink away ---

type ClearBurstProps = { cells: (ColoredCell & { delayMs: number })[]; cellSize: number };

function ClearBurst({ cells, cellSize }: ClearBurstProps) {
  const progress = useOneShot(CLEAR_TOTAL_MS);
  return cells.map((cell) => (
    <ClearCell
      key={`${cell.row}-${cell.col}`}
      cell={cell}
      cellSize={cellSize}
      progress={progress}
    />
  ));
}

type ClearCellProps = {
  cell: ColoredCell & { delayMs: number };
  cellSize: number;
  progress: SharedValue<number>;
};

/** A cleared cell's own 0..1 from the burst's progress, after its ripple delay. */
function cellProgress(burst: number, delayMs: number): number {
  'worklet';
  return interpolate(
    burst * CLEAR_TOTAL_MS,
    [delayMs, delayMs + EFFECT_MS.clearCell],
    [0, 1],
    Extrapolation.CLAMP,
  );
}

function ClearCell({ cell, cellSize, progress }: ClearCellProps) {
  const { delayMs } = cell;
  // Each style must read `progress` itself: Reanimated re-runs a style only for the shared
  // values it captures directly (or inside plain objects), not ones hidden in a helper function.
  const style = useAnimatedStyle(() => {
    const t = cellProgress(progress.get(), delayMs);
    return {
      opacity: interpolate(t, [0, 0.5, 1], [1, 1, 0]),
      transform: [{ scale: interpolate(t, [0, 0.3, 1], [1, 1.15, 0.3]) }],
    };
  });
  const flash = useAnimatedStyle(() => ({
    opacity: interpolate(
      cellProgress(progress.get(), delayMs),
      [0, 0.25, 0.6],
      [0, 0.65, 0],
      Extrapolation.CLAMP,
    ),
  }));
  const box = blockBox(cell, cellSize);
  return (
    <Animated.View testID="clear-cell" style={[styles.abs, box, style]}>
      <BentoBlock color={cell.color} size={box.width} />
      <Animated.View style={[styles.flash, flash]} />
    </Animated.View>
  );
}

// --- Score popup: "+90" floats up from the cleared lines and fades ---

type ScorePopupProps = { points: number; at: BoardPoint; cellSize: number };

function ScorePopup({ points, at, cellSize }: ScorePopupProps) {
  const progress = useOneShot(EFFECT_MS.popup, Easing.out(Easing.cubic));
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: interpolate(p, [0, 0.08, 0.7, 1], [0, 1, 1, 0]),
      transform: [
        { translateY: interpolate(p, [0, 1], [0, -cellSize * 1.25]) },
        { scale: interpolate(p, [0, 0.1, 0.2], [0.5, 1.15, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  // Centered on the point, but kept inside the board.
  const width = cellSize * 4;
  const boardSize = cellSize * BOARD_SIZE;
  const centerX = (at.col + 0.5) * cellSize;
  const left = Math.min(Math.max(centerX - width / 2, 0), boardSize - width);
  const top = (at.row + 0.5) * cellSize - cellSize / 2;

  return (
    <Animated.View
      style={[styles.abs, styles.center, { left, top, width, height: cellSize }, style]}
    >
      <Text testID="score-popup" style={[styles.popupText, { fontSize: cellSize * 0.62 }]}>
        +{points}
      </Text>
    </Animated.View>
  );
}

// --- Banners: "Combo ×3", "Board clear!" ---

type BannerProps = {
  testID: string;
  text: string;
  /** Center row, in cells. */
  row: number;
  cellSize: number;
  durationMs: number;
  big?: boolean;
};

function Banner({ testID, text, row, cellSize, durationMs, big }: BannerProps) {
  const progress = useOneShot(durationMs);
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      // Pops in, holds, fades out over the last quarter.
      opacity: interpolate(p, [0, 0.06, 0.75, 1], [0, 1, 1, 0]),
      transform: [
        { scale: interpolate(p, [0, 0.1, 0.18], [0.6, 1.12, 1], Extrapolation.CLAMP) },
        { translateY: interpolate(p, [0.75, 1], [0, -cellSize * 0.4], Extrapolation.CLAMP) },
      ],
    };
  });
  const height = cellSize * (big ? 1.4 : 1.1);
  const top = (row + 0.5) * cellSize - height / 2;

  return (
    <Animated.View
      style={[styles.abs, styles.bannerRow, { top, height, width: cellSize * BOARD_SIZE }, style]}
    >
      <View style={[styles.banner, { paddingHorizontal: cellSize * 0.4 }]}>
        <Text
          testID={testID}
          numberOfLines={1}
          style={[styles.bannerText, { fontSize: cellSize * (big ? 0.7 : 0.5) }]}
        >
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}

// --- Board clear: a flash over the whole board and blocks flying out from the middle ---

function BoardClearCelebration({ cellSize }: { cellSize: number }) {
  const flash = useOneShot(EFFECT_MS.flash);
  const burst = useOneShot(EFFECT_MS.confetti, Easing.out(Easing.cubic));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flash.get(), [0, 0.15, 1], [0, 0.5, 0]),
  }));
  return (
    <>
      <Animated.View testID="board-flash" style={[styles.flash, styles.boardFlash, flashStyle]} />
      {CONFETTI.map((piece, i) => (
        <Confetti key={i} piece={piece} cellSize={cellSize} progress={burst} />
      ))}
    </>
  );
}

type ConfettiPiece = { dx: number; dy: number; color: ColorId; spin: number };

/** Fixed directions, spread evenly with a little wobble, so render stays pure (no random). */
const CONFETTI: ConfettiPiece[] = Array.from({ length: CONFETTI_PIECES }, (_, i) => {
  const angle = (i / CONFETTI_PIECES) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
  const reach = 2.6 + (i % 3) * 0.7; // in cells
  return {
    dx: Math.cos(angle) * reach,
    dy: Math.sin(angle) * reach,
    color: (i % COLOR_COUNT) + 1,
    spin: (i % 2 ? 1 : -1) * (180 + (i % 4) * 60),
  };
});

type ConfettiProps = { piece: ConfettiPiece; cellSize: number; progress: SharedValue<number> };

function Confetti({ piece, cellSize, progress }: ConfettiProps) {
  const size = Math.max(4, Math.round(cellSize * 0.3));
  const center = (cellSize * BOARD_SIZE) / 2 - size / 2;
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: interpolate(p, [0, 0.6, 1], [1, 1, 0]),
      transform: [
        { translateX: piece.dx * cellSize * p },
        // A little gravity: pieces drift down as they slow.
        { translateY: piece.dy * cellSize * p + cellSize * 0.8 * p * p },
        { rotate: `${piece.spin * p}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.abs,
        styles.confetti,
        { left: center, top: center, width: size, height: size },
        { backgroundColor: colorFor(piece.color) },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    // Lines up with the cells: the board has half a grid gap of padding before the first one.
    left: sizes.cellGap / 2,
    top: sizes.cellGap / 2,
    pointerEvents: 'none',
  },
  abs: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.popupText,
  },
  boardFlash: {
    borderRadius: 8,
  },
  popupText: {
    color: colors.popupText,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textShadowColor: colors.popupShadow,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },
  bannerRow: {
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    paddingVertical: 4,
    borderWidth: 2,
    borderRadius: 6,
    borderColor: colors.blockOutline,
    backgroundColor: colors.accent,
  },
  bannerText: {
    color: colors.ink,
    fontWeight: '900',
  },
  confetti: {
    borderWidth: 1,
    borderColor: colors.blockOutline,
  },
});

// Shared state for dragging a tray piece. Everything here lives in Reanimated shared values, so
// the piece follows the finger on the UI thread without React renders. Only one piece can be
// dragged at a time: `phase` doubles as the lock.
//
// Coordinates are relative to the game screen's root view, which the drag overlay covers. They
// come from onLayout of the board and tray (both direct children of the root) plus the touch
// position inside a tray slot, so they all share one coordinate space on every platform.

import { LayoutChangeEvent } from 'react-native';
import { useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { BOARD_SIZE } from '@/engine';
import { sizes } from '@/theme';

import { BoardLayout, screenToCell } from './screenToCell';
import { useBoardLayout } from './useBoardLayout';

export const DragPhase = {
  /** No drag. A new one may start. */
  idle: 0,
  /** A finger is moving a piece. */
  dragging: 1,
  /** Released over the board; waiting for React to place it (or reject it). */
  dropping: 2,
  /** Springing back to the tray. */
  returning: 3,
} as const;

/** Set once when a drag starts. */
export type DragOrigin = {
  /** Where the finger first touched. */
  startX: number;
  startY: number;
  /** Center of the tray slot, where the piece springs back to. */
  homeX: number;
  homeY: number;
  /** The piece's size at board scale. */
  width: number;
  height: number;
  /** Tray scale of the piece (tray cell size / board cell size). */
  startScale: number;
};

/** `cellSize` is the board cell size. */
export function useDragState(cellSize: number) {
  const { layout: board, onBoardLayout } = useBoardLayout(cellSize);
  /** Top-left of the tray row. */
  const tray = useSharedValue({ x: 0, y: 0 });
  const onTrayLayout = (e: LayoutChangeEvent) => {
    const { x, y } = e.nativeEvent.layout;
    tray.set({ x, y });
  };

  const drag = {
    board,
    tray,
    phase: useSharedValue<number>(DragPhase.idle),
    /** Tray index of the dragged piece; -1 when idle. */
    slot: useSharedValue(-1),
    /** `pieceToken` of the dragged piece; -1 when idle. */
    token: useSharedValue(-1),
    /** The finger. */
    x: useSharedValue(0),
    y: useSharedValue(0),
    /** 0 = sitting in the tray at tray scale, 1 = picked up at board scale above the finger. */
    lift: useSharedValue(0),
    origin: useSharedValue<DragOrigin>({
      startX: 0,
      startY: 0,
      homeX: 0,
      homeY: 0,
      width: 0,
      height: 0,
      startScale: 1,
    }),
  };

  // The layout handlers are kept out of `drag`, which worklets capture: it should hold only
  // shared values.
  return { drag, onBoardLayout, onTrayLayout };
}

export type DragState = ReturnType<typeof useDragState>['drag'];

/** Lift animation when a piece is picked up. */
const LIFT_MS = 120;
/** Spring back to the tray: quick, with no bounce past the slot. */
const RETURN_SPRING = { duration: 300, dampingRatio: 1 } as const;

/**
 * Top-left of the dragged piece at board scale. At lift 0 it sits centered on its tray slot;
 * at lift 1 it is centered on the finger horizontally, with its bottom edge
 * `sizes.dragOffsetCells` above the finger so the finger doesn't hide it.
 */
export function pieceTopLeft(
  x: number,
  y: number,
  lift: number,
  origin: DragOrigin,
  cellSize: number,
): { x: number; y: number } {
  'worklet';
  const raise = origin.height / 2 + sizes.dragOffsetCells * cellSize;
  const centerX = x + (origin.homeX - origin.startX) * (1 - lift);
  const centerY = y + (origin.homeY - origin.startY) * (1 - lift) - raise * lift;
  return { x: centerX - origin.width / 2, y: centerY - origin.height / 2 };
}

/** The board cell under the dragged piece's top-left corner (may be off the board). */
export function hoveredCell(drag: DragState): { row: number; col: number } {
  'worklet';
  const board: BoardLayout = drag.board.get();
  const corner = pieceTopLeft(
    drag.x.get(),
    drag.y.get(),
    drag.lift.get(),
    drag.origin.get(),
    board.cellSize,
  );
  return screenToCell(corner.x, corner.y, board);
}

/**
 * Identifies one tray piece for the length of one move: it changes in the same React render
 * that places the piece (moves goes up), so views that show or hide the dragged piece by token
 * switch over exactly when the board draws it, whatever the UI thread is doing.
 */
export function pieceToken(moves: number, slot: number): number {
  'worklet';
  return moves * 10 + slot;
}

/** True while the piece with this token is away from the tray, drawn by the drag overlay. */
export function isAway(drag: DragState, token: number): boolean {
  'worklet';
  return drag.token.get() === token && drag.phase.get() !== DragPhase.idle;
}

/** Hover key meaning "not over any cell the piece could go". */
export const NO_HOVER = -1;

/**
 * Packs the dragged slot and hovered cell into one number, so the UI thread can cheaply tell
 * when it changed. Rows and columns are clamped to -1..8: every off-board cell is the same
 * "doesn't fit" to React, so moving around off the board sends nothing.
 */
export function hoverKey(slot: number, row: number, col: number): number {
  'worklet';
  const clamp = (n: number) => Math.min(Math.max(n, -1), BOARD_SIZE);
  return slot * 100 + (clamp(row) + 1) * 10 + (clamp(col) + 1);
}

export function parseHoverKey(key: number): { slot: number; row: number; col: number } | null {
  if (key === NO_HOVER) return null;
  return {
    slot: Math.floor(key / 100),
    row: (Math.floor(key / 10) % 10) - 1,
    col: (key % 10) - 1,
  };
}

/** Starts the pick-up animation. Call after setting `origin`, `x` and `y`. */
export function pickUp(drag: DragState, slot: number, token: number) {
  'worklet';
  drag.slot.set(slot);
  drag.token.set(token);
  drag.phase.set(DragPhase.dragging);
  drag.lift.set(0);
  drag.lift.set(withTiming(1, { duration: LIFT_MS }));
}

/**
 * Frees the lock and hides the overlay piece. Defined before the worklets that call it: the
 * worklets plugin turns worklet functions into values, so they aren't hoisted.
 */
export function endDrag(drag: DragState) {
  'worklet';
  drag.phase.set(DragPhase.idle);
  drag.slot.set(-1);
  drag.token.set(-1);
  drag.lift.set(0);
}

/** Springs the piece back to its tray slot, then frees the lock. Safe to call from JS too. */
export function returnToTray(drag: DragState) {
  'worklet';
  const origin = drag.origin.get();
  drag.phase.set(DragPhase.returning);
  drag.x.set(withSpring(origin.startX, RETURN_SPRING));
  drag.y.set(withSpring(origin.startY, RETURN_SPRING));
  drag.lift.set(
    withSpring(0, RETURN_SPRING, () => {
      // No new drag can start while returning, so the lock is still ours. Free it even if the
      // spring was interrupted, or no piece could ever be dragged again.
      if (drag.phase.get() === DragPhase.returning) endDrag(drag);
    }),
  );
}

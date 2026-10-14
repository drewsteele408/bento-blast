import { SHAPES } from './pieces';
import { nextInt, nextWeightedIndex } from './rng';
import { COLOR_COUNT, Piece, Shape, Tray, TRAY_SIZE } from './types';

export type DealResult = { tray: Tray; rngState: number };

/** One weighted-random shape plus a random color (1..COLOR_COUNT). Uses two RNG draws. */
export function dealPiece(
  rngState: number,
  shapes: readonly Shape[] = SHAPES,
): { piece: Piece; rngState: number } {
  const shapePick = nextWeightedIndex(
    rngState,
    shapes.map((s) => s.weight),
  );
  const colorPick = nextInt(shapePick.state, COLOR_COUNT);
  return {
    piece: { shapeId: shapes[shapePick.value].id, color: colorPick.value + 1 },
    rngState: colorPick.state,
  };
}

/** Deals a full tray of three pieces. No "fair deal" guarantee (see the spec's decision log). */
export function dealTray(rngState: number, shapes: readonly Shape[] = SHAPES): DealResult {
  const tray: Tray = [];
  let state = rngState;
  for (let i = 0; i < TRAY_SIZE; i++) {
    const dealt = dealPiece(state, shapes);
    tray.push(dealt.piece);
    state = dealt.rngState;
  }
  return { tray, rngState: state };
}

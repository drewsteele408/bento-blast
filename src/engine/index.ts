// Public engine API. The store and UI import from '@/engine'.

export * from './types';
export { canPlace, applyPiece, shapeCellsAt } from './placement';
export { findFullLines, clearLines, cellsInLines } from './clearing';
export type { FullLines } from './clearing';
export { scoreMove, scoreBreakdown } from './scoring';
export type { ScoreInput, ScoreBreakdown } from './scoring';
export { SHAPES, getShape, hasShape } from './pieces';
export { dealTray, dealPiece } from './dealer';
export { createGame, placePiece, hasAnyValidMove, isValidMove } from './game';
export type { MoveResult } from './game';
export { isValidGameState } from './validate';

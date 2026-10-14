import { DragOrigin, hoverKey, NO_HOVER, parseHoverKey, pieceTopLeft } from '../useDragState';

// A 2×3-cell piece (80×120 at a 40px board cell) picked up from a slot centered at (200, 600),
// touched 10px right of and 20px below the slot's center.
const CELL = 40;
const origin: DragOrigin = {
  startX: 210,
  startY: 620,
  homeX: 200,
  homeY: 600,
  width: 80,
  height: 120,
  startScale: 0.6,
};

describe('pieceTopLeft', () => {
  it('centers the piece on its tray slot before it lifts', () => {
    // Center (200, 600) → top-left (160, 540), wherever the finger touched.
    expect(pieceTopLeft(210, 620, 0, origin, CELL)).toEqual({ x: 160, y: 540 });
  });

  it('centers a lifted piece on the finger, 1.5 cells above it', () => {
    // Finger at (100, 400). Bottom edge at 400 - 1.5 × 40 = 340, so the top is 340 - 120.
    expect(pieceTopLeft(100, 400, 1, origin, CELL)).toEqual({ x: 60, y: 220 });
  });

  it('follows the finger while lifting', () => {
    // Halfway: half the grab offset (-5, -10) and half the raise (60 + 60) / 2.
    expect(pieceTopLeft(100, 400, 0.5, origin, CELL)).toEqual({
      x: 100 - 5 - 40,
      y: 400 - 10 - 60 - 60,
    });
  });
});

describe('hoverKey', () => {
  it('round-trips slot, row and column', () => {
    expect(parseHoverKey(hoverKey(0, 0, 0))).toEqual({ slot: 0, row: 0, col: 0 });
    expect(parseHoverKey(hoverKey(2, 7, 5))).toEqual({ slot: 2, row: 7, col: 5 });
    expect(parseHoverKey(hoverKey(1, -1, 8))).toEqual({ slot: 1, row: -1, col: 8 });
  });

  it('gives every far-off cell the same key, so moving off the board sends nothing', () => {
    expect(hoverKey(1, -5, 3)).toBe(hoverKey(1, -1, 3));
    expect(hoverKey(1, 20, 30)).toBe(hoverKey(1, 8, 8));
  });

  it('never collides with NO_HOVER', () => {
    expect(hoverKey(0, -1, -1)).not.toBe(NO_HOVER);
    expect(parseHoverKey(NO_HOVER)).toBeNull();
  });
});

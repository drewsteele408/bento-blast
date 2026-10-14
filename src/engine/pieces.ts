// Shape catalog. Pieces cannot be rotated, so every orientation is its own shape.
// Shapes are drawn as text ('#' = block) so each orientation is easy to check by eye.

import { Cell, Shape, ShapeId } from './types';

type ShapeDef = [id: ShapeId, weight: number, art: string[]];

// Weights are relative chances of being dealt (per orientation). Tunable.
const SHAPE_DEFS: ShapeDef[] = [
  // Single block
  ['S1', 4, ['#']],

  // Lines
  ['I2-h', 4, ['##']],
  ['I2-v', 4, ['#', '#']],
  ['I3-h', 4, ['###']],
  ['I3-v', 4, ['#', '#', '#']],
  ['I4-h', 3, ['####']],
  ['I4-v', 3, ['#', '#', '#', '#']],
  ['I5-h', 2, ['#####']],
  ['I5-v', 2, ['#', '#', '#', '#', '#']],

  // Squares
  ['SQ2', 6, ['##', '##']],
  ['SQ3', 2, ['###', '###', '###']],

  // 3-cell corners
  ['C3-0', 3, ['##', '#.']],
  ['C3-90', 3, ['##', '.#']],
  ['C3-180', 3, ['.#', '##']],
  ['C3-270', 3, ['#.', '##']],

  // L and J (4 cells), rotated clockwise
  ['L4-0', 2, ['#.', '#.', '##']],
  ['L4-90', 2, ['###', '#..']],
  ['L4-180', 2, ['##', '.#', '.#']],
  ['L4-270', 2, ['..#', '###']],
  ['J4-0', 2, ['.#', '.#', '##']],
  ['J4-90', 2, ['#..', '###']],
  ['J4-180', 2, ['##', '#.', '#.']],
  ['J4-270', 2, ['###', '..#']],

  // T (4 cells)
  ['T4-0', 2, ['###', '.#.']],
  ['T4-90', 2, ['.#', '##', '.#']],
  ['T4-180', 2, ['.#.', '###']],
  ['T4-270', 2, ['#.', '##', '#.']],

  // S and Z (4 cells)
  ['S4-h', 2, ['.##', '##.']],
  ['S4-v', 2, ['#.', '##', '.#']],
  ['Z4-h', 2, ['##.', '.##']],
  ['Z4-v', 2, ['.#', '##', '#.']],

  // Big L (5 cells)
  ['L5-0', 2, ['#..', '#..', '###']],
  ['L5-90', 2, ['###', '#..', '#..']],
  ['L5-180', 2, ['###', '..#', '..#']],
  ['L5-270', 2, ['..#', '..#', '###']],

  // 2x3 rectangles
  ['R6-h', 2, ['###', '###']],
  ['R6-v', 2, ['##', '##', '##']],
];

/** Turns text art into a shape with normalized cells (min row and col are 0). */
function shapeFromArt(id: ShapeId, weight: number, art: string[]): Shape {
  const raw: Cell[] = [];
  art.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      if (ch === '#') raw.push({ row, col });
    });
  });
  const minRow = Math.min(...raw.map((c) => c.row));
  const minCol = Math.min(...raw.map((c) => c.col));
  const cells = raw.map((c) => ({ row: c.row - minRow, col: c.col - minCol }));
  return {
    id,
    cells,
    width: Math.max(...cells.map((c) => c.col)) + 1,
    height: Math.max(...cells.map((c) => c.row)) + 1,
    weight,
  };
}

export const SHAPES: readonly Shape[] = SHAPE_DEFS.map(([id, weight, art]) =>
  shapeFromArt(id, weight, art),
);

const SHAPES_BY_ID: ReadonlyMap<ShapeId, Shape> = new Map(SHAPES.map((s) => [s.id, s]));

/** Looks up a shape by ID. Throws for an unknown ID, which means corrupt state or a typo. */
export function getShape(id: ShapeId): Shape {
  const shape = SHAPES_BY_ID.get(id);
  if (!shape) throw new Error(`Unknown shape id: ${id}`);
  return shape;
}

export function hasShape(id: ShapeId): boolean {
  return SHAPES_BY_ID.has(id);
}

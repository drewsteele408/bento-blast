import { getShape, hasShape, SHAPES } from '../pieces';
import { BOARD_SIZE } from '../types';

const cellKey = (c: { row: number; col: number }) => `${c.row},${c.col}`;

describe('shape catalog', () => {
  it('has 37 shapes', () => {
    expect(SHAPES).toHaveLength(37);
  });

  it('includes every family from the spec', () => {
    // prettier-ignore
    const ids = [
      'S1',
      'I2-h', 'I2-v', 'I3-h', 'I3-v', 'I4-h', 'I4-v', 'I5-h', 'I5-v',
      'SQ2', 'SQ3',
      'C3-0', 'C3-90', 'C3-180', 'C3-270',
      'L4-0', 'L4-90', 'L4-180', 'L4-270', 'J4-0', 'J4-90', 'J4-180', 'J4-270',
      'T4-0', 'T4-90', 'T4-180', 'T4-270',
      'S4-h', 'S4-v', 'Z4-h', 'Z4-v',
    ];
    for (const id of ids) expect(hasShape(id)).toBe(true);
  });

  it('has no duplicate IDs', () => {
    const ids = SHAPES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no two shapes with the same cells (every orientation is distinct)', () => {
    const keys = SHAPES.map((s) => s.cells.map(cellKey).sort().join(' '));
    expect(new Set(keys).size).toBe(keys.length);
  });

  describe.each(SHAPES.map((s) => [s.id, s] as const))('%s', (_id, shape) => {
    it('is normalized (min row and min col are 0)', () => {
      expect(Math.min(...shape.cells.map((c) => c.row))).toBe(0);
      expect(Math.min(...shape.cells.map((c) => c.col))).toBe(0);
    });

    it('has width/height matching its cells and fits on the board', () => {
      expect(shape.width).toBe(Math.max(...shape.cells.map((c) => c.col)) + 1);
      expect(shape.height).toBe(Math.max(...shape.cells.map((c) => c.row)) + 1);
      expect(shape.width).toBeLessThanOrEqual(BOARD_SIZE);
      expect(shape.height).toBeLessThanOrEqual(BOARD_SIZE);
    });

    it('has no duplicate cells', () => {
      const keys = shape.cells.map(cellKey);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('has a positive weight', () => {
      expect(shape.weight).toBeGreaterThan(0);
    });
  });

  it('builds shapes with the expected cells', () => {
    expect(getShape('S1').cells).toEqual([{ row: 0, col: 0 }]);
    expect(getShape('I3-v').cells).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
    ]);
    expect(getShape('T4-0')).toMatchObject({ width: 3, height: 2 });
    expect(getShape('T4-0').cells).toHaveLength(4);
    expect(getShape('SQ3').cells).toHaveLength(9);
    expect(getShape('L4-270').cells).toEqual([
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ]);
  });

  it('getShape throws for an unknown ID', () => {
    expect(() => getShape('nope')).toThrow('Unknown shape id: nope');
    expect(hasShape('nope')).toBe(false);
  });
});

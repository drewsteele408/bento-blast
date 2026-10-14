// The three tray slots. Pieces draw at tray scale; a slot whose piece was placed stays empty
// so the other pieces don't shift.

import { Pressable, StyleSheet, View } from 'react-native';

import { Tray } from '@/engine';
import { colors, sizes } from '@/theme';

import { PieceView } from './PieceView';

/** The widest and tallest shape is 5 cells, so every slot is sized to fit 5×5. */
const MAX_SHAPE_CELLS = 5;
/** Border plus breathing room between a slot's edge and its piece. */
const SLOT_INSET = 6;

type Props = {
  tray: Tray;
  /** Width of the whole tray (the board width). */
  width: number;
  /** Board cell size; tray pieces draw at `sizes.trayScale` of it, or smaller if they must. */
  boardCellSize: number;
  /** Debug tap-to-place: the slot that is currently picked, if any. */
  selectedIndex?: number | null;
  onSlotPress?: (index: number) => void;
};

export function PieceTray({ tray, width, boardCellSize, selectedIndex, onSlotPress }: Props) {
  const slotSize = width / tray.length;
  const cellSize = Math.min(
    boardCellSize * sizes.trayScale,
    (slotSize - SLOT_INSET * 2) / MAX_SHAPE_CELLS,
  );

  return (
    <View testID="piece-tray" style={[styles.tray, { width }]}>
      {tray.map((piece, index) => (
        <Pressable
          key={index}
          testID={`tray-slot-${index}`}
          accessibilityRole="button"
          accessibilityLabel={piece ? `Tray piece ${index + 1}` : `Empty tray slot ${index + 1}`}
          accessibilityState={{ selected: selectedIndex === index, disabled: !piece }}
          disabled={!piece || !onSlotPress}
          onPress={() => onSlotPress?.(index)}
          style={[
            styles.slot,
            { width: slotSize, height: cellSize * MAX_SHAPE_CELLS + SLOT_INSET * 2 },
            selectedIndex === index && styles.selected,
          ]}
        >
          {piece && <PieceView piece={piece} cellSize={cellSize} />}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    flexDirection: 'row',
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: colors.selected,
  },
});

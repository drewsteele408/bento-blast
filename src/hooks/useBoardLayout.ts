// Where the board sits, for the drag gesture. Coordinates are relative to the game screen's root
// view, which the drag overlay exactly covers, so no conversion to window coordinates is needed.
// Layout positions also ignore transforms, so they stay right while the Stack transition is
// still sliding the screen in.

import { LayoutChangeEvent } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { sizes } from '@/theme';

import { BoardLayout } from './screenToCell';

/**
 * The board layout as a shared value, plus an `onLayout` handler for the board view. The board
 * must be a direct child of the root view for the coordinates to line up.
 */
export function useBoardLayout(cellSize: number) {
  const layout = useSharedValue<BoardLayout>({ x: 0, y: 0, cellSize });

  const onBoardLayout = (e: LayoutChangeEvent) => {
    const { x, y } = e.nativeEvent.layout;
    // The board has half a grid gap of padding before the first cell.
    layout.set({ x: x + sizes.cellGap / 2, y: y + sizes.cellGap / 2, cellSize });
  };

  return { layout, onBoardLayout };
}

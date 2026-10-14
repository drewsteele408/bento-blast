// The game screen's content: score bar, board and tray. Reads the store and dispatches moves.
//
// Phase 2 input is a debug tap-to-place mode (dev builds only): tap a tray piece to pick it,
// then tap a board cell to place it with that cell as the piece's top-left.
// Drag and drop replaces this as the real input in Phase 3.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BOARD_SIZE, Tray } from '@/engine';
import { useGame, useGameDispatch } from '@/store';
import { colors, sizes } from '@/theme';

import { Board } from './Board';
import { PieceTray } from './PieceTray';
import { ScoreBar } from './ScoreBar';

/** Turns on tap-to-place. Dev builds only; it stays useful for testing later phases. */
const TAP_TO_PLACE = __DEV__;

/** Space taken by the status bar, header and home indicator, roughly. */
const SCREEN_CHROME_HEIGHT = 160;
/** Board rows plus the tray (5 cells at tray scale) plus about 2 rows for the score and text. */
const ROWS_OF_CONTENT = BOARD_SIZE + 5 * sizes.trayScale + 2;

export function GameView() {
  const { game } = useGame();
  const dispatch = useGameDispatch();
  const { width, height } = useWindowDimensions();

  // Fit the screen width, but shrink on short phones so the tray isn't pushed offscreen.
  const cellSize = Math.floor(
    Math.min(
      (width - sizes.boardPadding * 2) / BOARD_SIZE,
      (height - SCREEN_CHROME_HEIGHT) / ROWS_OF_CONTENT,
    ),
  );
  const boardWidth = cellSize * BOARD_SIZE + sizes.cellGap;

  // The picked slot is tied to the tray it was picked from. Every real move gives the engine a
  // new tray object, so a placement (or a new deal or game) drops the selection by itself,
  // while an invalid tap leaves the tray alone and keeps the piece picked.
  const [selected, setSelected] = useState<{ index: number; tray: Tray } | null>(null);
  const selectedIndex = selected?.tray === game.tray ? selected.index : null;

  const onSlotPress = useCallback(
    (index: number) =>
      setSelected((current) =>
        current?.index === index && current.tray === game.tray ? null : { index, tray: game.tray },
      ),
    [game.tray],
  );

  // Read the selection through a ref so onCellPress never changes and the memoized cells
  // don't re-render when a piece is picked. The reducer ignores invalid moves.
  const selectedRef = useRef(selectedIndex);
  useEffect(() => {
    selectedRef.current = selectedIndex;
  }, [selectedIndex]);

  const onCellPress = useCallback(
    (row: number, col: number) => {
      const trayIndex = selectedRef.current;
      if (trayIndex === null) return;
      dispatch({ type: 'placePiece', trayIndex, row, col });
    },
    [dispatch],
  );

  const canPick = TAP_TO_PLACE && !game.isOver;

  return (
    <View style={styles.container}>
      <View style={{ width: boardWidth }}>
        <ScoreBar score={game.score} best={0} combo={game.combo} />
      </View>

      <Board
        board={game.board}
        cellSize={cellSize}
        onCellPress={TAP_TO_PLACE ? onCellPress : undefined}
      />

      <PieceTray
        tray={game.tray}
        width={boardWidth}
        boardCellSize={cellSize}
        selectedIndex={canPick ? selectedIndex : null}
        onSlotPress={canPick ? onSlotPress : undefined}
      />

      {game.isOver && (
        <Text testID="game-over" style={styles.gameOver}>
          Game over
        </Text>
      )}

      {TAP_TO_PLACE && (
        <Pressable
          accessibilityRole="button"
          onPress={() => dispatch({ type: 'newGame', seed: Date.now() })}
          style={styles.debugButton}
        >
          <Text style={styles.debugText}>Debug: new game</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: colors.background,
  },
  gameOver: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '800',
  },
  debugButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  debugText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});

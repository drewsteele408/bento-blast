// The game screen's content: pause button, score bar, board and tray, the overlay that draws the
// piece being dragged, and the pause and game-over dialogs. Reads the store and dispatches moves.
//
// Dragging runs on the UI thread (see useDragState). React hears about it only when the hovered
// cell changes, to draw the ghost preview, and when a piece is released.

import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { BOARD_SIZE, isValidMove } from '@/engine';
import { placementPreview } from '@/hooks/placementPreview';
import {
  DragPhase,
  endDrag,
  NO_HOVER,
  parseHoverKey,
  pieceToken,
  returnToTray,
  useDragState,
} from '@/hooks/useDragState';
import { selectBest, selectIsNewBest, useGame, useGameDispatch } from '@/store';
import { colors, sizes } from '@/theme';

import { Board } from './Board';
import { DragLayer } from './DragLayer';
import { GameOverModal } from './GameOverModal';
import { PauseButton, PauseMenu } from './PauseMenu';
import { PieceTray } from './PieceTray';
import { ScoreBar } from './ScoreBar';

/** Space taken by the status bar, pause button row and home indicator, roughly. */
const SCREEN_CHROME_HEIGHT = 160;
/** Board rows plus the tray (5 cells at tray scale) plus about 2 rows for the score and text. */
const ROWS_OF_CONTENT = BOARD_SIZE + 5 * sizes.trayScale + 2;

type Props = {
  /** Leave the game screen. The game stays saved. */
  onHome: () => void;
};

export function GameView({ onHome }: Props) {
  const store = useGame();
  const { game } = store;
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
  const { drag, onBoardLayout, onTrayLayout } = useDragState(cellSize);

  // The hovered slot and cell, as a hoverKey. Changes only when the piece crosses a cell.
  const [hover, setHover] = useState(NO_HOVER);
  const hovered = parseHoverKey(hover);
  const hoveredPiece = hovered ? game.tray[hovered.slot] : null;
  const preview =
    hovered && hoveredPiece
      ? placementPreview(game.board, hoveredPiece, hovered.row, hovered.col)
      : null;

  const onHover = (key: number) => {
    // A hover that arrives after the drop belongs to a drag that's over; with a fresh deal in
    // the same slot, it would flash a ghost of the new piece.
    if (key !== NO_HOVER && drag.phase.get() !== DragPhase.dragging) return;
    setHover(key);
  };

  const onDrop = (index: number, token: number, row: number, col: number) => {
    setHover(NO_HOVER);
    // A stale token means the gesture was built for a tray that has since changed.
    if (token !== pieceToken(game.moves, index) || !isValidMove(game, index, row, col)) {
      returnToTray(drag);
      return;
    }
    // The drag stays in the dropping phase (lock held, overlay showing the piece) until this
    // placement has rendered; the effect below frees it. The overlay and tray slot hide by
    // token, so they switch over in the same render that draws the piece on the board.
    dispatch({ type: 'placePiece', trayIndex: index, row, col });
  };

  useEffect(() => {
    if (drag.phase.get() === DragPhase.dropping) endDrag(drag);
  }, [game, drag]);

  const [paused, setPaused] = useState(false);
  // Set when heading home: hides the dialogs before the screen goes away.
  const [leaving, setLeaving] = useState(false);

  const onPause = () => {
    // A finger is still holding a piece; pausing now would leave it hanging under the menu.
    if (drag.phase.get() !== DragPhase.idle) return;
    setPaused(true);
  };

  const onRestart = () => {
    setPaused(false);
    endDrag(drag);
    dispatch({ type: 'newGame', seed: Date.now() });
  };

  const goHome = () => {
    if (leaving) return;
    setPaused(false);
    setLeaving(true);
    // Leave on the next frame, once the dialog is hidden: a Modal still showing while its
    // screen is popped can get stuck on iOS.
    requestAnimationFrame(onHome);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.top, { width: boardWidth }]}>
        <View style={styles.pauseRow}>
          <PauseButton onPress={onPause} disabled={game.isOver} />
        </View>
        <ScoreBar score={game.score} best={selectBest(store)} combo={game.combo} />
      </View>

      {/* Board and tray must stay direct children of this view: drag coordinates come from
          their onLayout, relative to it. */}
      <Board board={game.board} cellSize={cellSize} preview={preview} onLayout={onBoardLayout} />

      <PieceTray
        tray={game.tray}
        moves={game.moves}
        width={boardWidth}
        boardCellSize={cellSize}
        drag={drag}
        enabled={!game.isOver}
        onDrop={onDrop}
        onLayout={onTrayLayout}
      />

      <DragLayer
        tray={game.tray}
        moves={game.moves}
        cellSize={cellSize}
        drag={drag}
        onHover={onHover}
      />

      <PauseMenu
        visible={paused && !game.isOver && !leaving}
        onResume={() => setPaused(false)}
        onRestart={onRestart}
        onHome={goHome}
      />

      <GameOverModal
        visible={game.isOver && !leaving}
        score={game.score}
        best={selectBest(store)}
        isNewBest={selectIsNewBest(store)}
        onRestart={onRestart}
        onHome={goHome}
      />
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
  top: {
    gap: 8,
  },
  pauseRow: {
    flexDirection: 'row',
  },
});

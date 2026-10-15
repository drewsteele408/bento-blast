// The game screen's content: pause button, score bar, board and tray, the overlay that draws the
// piece being dragged, and the pause and game-over dialogs. Reads the store and dispatches moves.
//
// Dragging runs on the UI thread (see useDragState). React hears about it only when the hovered
// cell changes, to draw the ghost preview, and when a piece is released. After each move, the
// board effects (clear animation, score popup, banners) play from the move's events.

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { BOARD_SIZE, GameEvent, isValidMove } from '@/engine';
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
import { boardRim, colors, sizes } from '@/theme';

import { Board } from './Board';
import { BoardEffects } from './BoardEffects';
import { DragLayer } from './DragLayer';
import { GameOverModal } from './GameOverModal';
import { PauseButton, PauseMenu } from './PauseMenu';
import { PieceTray } from './PieceTray';
import { ScoreBar } from './ScoreBar';

/** Space taken by the status bar, pause button row and home indicator, roughly. */
const SCREEN_CHROME_HEIGHT = 160;
/** Room for the board's lacquer rim, in cells: both sides together come to under one cell. */
const BOARD_RIM_CELLS = 1;
/** Board rows plus the tray (5 cells at tray scale) plus about 2 rows for the score and text. */
const ROWS_OF_CONTENT = BOARD_SIZE + BOARD_RIM_CELLS + 5 * sizes.trayScale + 2;
const NO_EVENTS: readonly GameEvent[] = [];
/** How long the board stays in view after the last move, before the game-over modal. */
export const GAME_OVER_DELAY_MS = 900;

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
      (width - sizes.boardPadding * 2) / (BOARD_SIZE + BOARD_RIM_CELLS),
      (height - SCREEN_CHROME_HEIGHT) / ROWS_OF_CONTENT,
    ),
  );
  const boardWidth = cellSize * BOARD_SIZE + sizes.cellGap + boardRim(cellSize) * 2;
  const { drag, onBoardLayout, onTrayLayout } = useDragState(cellSize);

  // The events of each move made on this screen, for the board effects. Whatever the store
  // already held when the screen opened belongs to an earlier visit, and isn't replayed.
  const [eventsOnOpen] = useState(store.lastEvents);
  const effectEvents = store.lastEvents === eventsOnOpen ? NO_EVENTS : store.lastEvents;

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

  // The game as last rendered. onDrop checks moves against it rather than against the `game` it
  // closed over: a gesture can call an onDrop from an older render, and approving a move on an
  // old board that the store then rejects would leave the drag locked for good.
  const renderedGame = useRef(game);

  const onDrop = (index: number, token: number, row: number, col: number) => {
    setHover(NO_HOVER);
    const current = renderedGame.current;
    // A stale token means the gesture was built for a tray that has since changed.
    if (token !== pieceToken(current.moves, index) || !isValidMove(current, index, row, col)) {
      returnToTray(drag);
      return;
    }
    // The drag stays in the dropping phase (lock held, overlay showing the piece) until this
    // placement has rendered; the effect below frees it. The overlay and tray slot hide by
    // token, so they switch over in the same render that draws the piece on the board.
    dispatch({ type: 'placePiece', trayIndex: index, row, col });
  };

  useEffect(() => {
    renderedGame.current = game;
    // Before freeing the lock, so the UI thread knows which tray it belongs to by then.
    drag.moves.set(game.moves);
    if (drag.phase.get() === DragPhase.dropping) endDrag(drag);
  }, [game, drag]);

  // The game-over modal waits a moment, so the last move's clear and popup can be seen. The
  // game it was revealed for is remembered: a game already over when the screen opens shows
  // it straight away, and a new game hides it.
  const [revealedOver, setRevealedOver] = useState(game.isOver ? game : null);
  useEffect(() => {
    if (!game.isOver) return;
    const timer = setTimeout(() => setRevealedOver(game), GAME_OVER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [game]);
  const showGameOver = game.isOver && revealedOver === game;

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
      <Board board={game.board} cellSize={cellSize} preview={preview} onLayout={onBoardLayout}>
        {/* Remounted per move, which plays that move's effects and ends the last move's. */}
        <BoardEffects key={game.moves} events={effectEvents} cellSize={cellSize} />
      </Board>

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
        visible={showGameOver && !leaving}
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

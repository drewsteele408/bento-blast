import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { createGame } from '@/engine';
import { loadGame, saveGame, setBestScore, storage } from '@/services/storage';
import { GameProvider } from '@/store';

import Home from '@/app/index';

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }));

const push = router.push as jest.Mock;

async function renderHome() {
  await render(
    <GameProvider initialSeed={1}>
      <Home />
    </GameProvider>,
  );
}

beforeEach(() => {
  storage.clearAll();
  push.mockClear();
});

describe('Home', () => {
  it('without a saved game, shows Play but not Continue, and Play opens a game', async () => {
    await renderHome();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/game'));
  });

  it('shows the best score', async () => {
    setBestScore(4321);
    await renderHome();
    expect(screen.getByTestId('home-best')).toHaveTextContent('4321');
  });

  it('with a saved game, Continue opens it unchanged', async () => {
    const saved = { ...createGame(3), score: 120, moves: 9 };
    saveGame(saved);
    await renderHome();

    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/game'));
    expect(loadGame()).toEqual(saved);
  });

  it('asks before a new game overwrites the save; Cancel keeps it', async () => {
    const saved = { ...createGame(3), score: 120, moves: 9 };
    saveGame(saved);
    await renderHome();

    await fireEvent.press(screen.getByRole('button', { name: 'New game' }));
    expect(screen.getByTestId('confirm-new-game')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByTestId('confirm-new-game')).toBeNull();
    expect(loadGame()).toEqual(saved);
  });

  it('confirming starts a new game and opens it', async () => {
    saveGame({ ...createGame(3), score: 120, moves: 9 });
    await renderHome();

    await fireEvent.press(screen.getByRole('button', { name: 'New game' }));
    // The dialog's button has the same label as the one that opened it.
    const buttons = screen.getAllByRole('button', { name: 'New game' });
    await fireEvent.press(buttons[buttons.length - 1]);

    await waitFor(() => expect(push).toHaveBeenCalledWith('/game'));
    expect(loadGame()!.moves).toBe(0);
    // The abandoned game's score counts toward the best.
    expect(screen.getByTestId('home-best')).toHaveTextContent('120');
  });

  it('ignores a second tap while leaving', async () => {
    await renderHome();
    const play = screen.getByRole('button', { name: 'Play' });
    await fireEvent.press(play);
    await fireEvent.press(play);
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    // Give a second push, if any, time to land.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('Settings opens the settings screen', async () => {
    await renderHome();
    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/settings'));
  });
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { getBestScore, getSettings, setBestScore, storage } from '@/services/storage';
import { GameProvider, SettingsProvider } from '@/store';

import Settings from '@/app/settings';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.3' } },
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Warning: 'warning' },
}));

const impact = Haptics.impactAsync as jest.Mock;

async function renderSettings() {
  await render(
    <SettingsProvider>
      <GameProvider initialSeed={1}>
        <Settings />
      </GameProvider>
    </SettingsProvider>,
  );
}

beforeEach(() => {
  storage.clearAll();
  impact.mockClear();
});

describe('Settings', () => {
  it('shows both toggles on by default, and the app version', async () => {
    await renderSettings();
    expect(screen.getByRole('switch', { name: 'Sound' })).toHaveProp('value', true);
    expect(screen.getByRole('switch', { name: 'Haptics' })).toHaveProp('value', true);
    expect(screen.getByTestId('app-version')).toHaveTextContent('Version 1.2.3');
  });

  it('saves the sound toggle', async () => {
    await renderSettings();
    await fireEvent(screen.getByRole('switch', { name: 'Sound' }), 'valueChange', false);
    expect(screen.getByRole('switch', { name: 'Sound' })).toHaveProp('value', false);
    expect(getSettings()).toEqual({ sound: false, haptics: true });
  });

  it('saves the haptics toggle, and taps once when it is turned back on', async () => {
    await renderSettings();
    await fireEvent(screen.getByRole('switch', { name: 'Haptics' }), 'valueChange', false);
    expect(getSettings().haptics).toBe(false);
    expect(impact).not.toHaveBeenCalled();

    await fireEvent(screen.getByRole('switch', { name: 'Haptics' }), 'valueChange', true);
    expect(getSettings().haptics).toBe(true);
    expect(impact).toHaveBeenCalledTimes(1);
  });

  it('loads saved settings', async () => {
    storage.set('settings', JSON.stringify({ sound: false, haptics: false }));
    await renderSettings();
    expect(screen.getByRole('switch', { name: 'Sound' })).toHaveProp('value', false);
    expect(screen.getByRole('switch', { name: 'Haptics' })).toHaveProp('value', false);
  });

  it('resets the best score only after confirming', async () => {
    setBestScore(1234);
    await renderSettings();
    expect(screen.getByTestId('settings-best')).toHaveTextContent('1234');

    await fireEvent.press(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByTestId('confirm-reset-best')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByTestId('confirm-reset-best')).toBeNull();
    expect(getBestScore()).toBe(1234);

    await fireEvent.press(screen.getByRole('button', { name: 'Reset' }));
    // The dialog's Reset, not the row's: the dialog is the last one rendered.
    const buttons = screen.getAllByRole('button', { name: 'Reset' });
    await fireEvent.press(buttons[buttons.length - 1]);
    expect(screen.queryByTestId('confirm-reset-best')).toBeNull();
    expect(screen.getByTestId('settings-best')).toHaveTextContent('0');
    expect(getBestScore()).toBe(0);
  });

  it('disables Reset when there is no best score', async () => {
    await renderSettings();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });
});

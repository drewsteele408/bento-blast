import * as Haptics from 'expo-haptics';

import { GameEvent } from '@/engine';

import { clear, feedbackForEvents, gameOver, place } from '../haptics';
import { setSettings, storage } from '../storage';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const impact = Haptics.impactAsync as jest.Mock;
const notification = Haptics.notificationAsync as jest.Mock;

const placed: GameEvent = { type: 'placed', trayIndex: 0, cells: [], color: 1, points: 1 };
const cleared: GameEvent = {
  type: 'cleared',
  rows: [0],
  cols: [],
  cells: [],
  points: 10,
  combo: 0,
};
const over: GameEvent = { type: 'gameOver', finalScore: 11 };

beforeEach(() => {
  storage.clearAll();
  impact.mockClear();
  notification.mockClear();
});

describe('haptics', () => {
  it('plays a light tap on place, medium on clear and a warning on game over', () => {
    place();
    clear();
    gameOver();
    expect(impact.mock.calls).toEqual([['light'], ['medium']]);
    expect(notification).toHaveBeenCalledWith('warning');
  });

  it('does nothing when haptics are off', () => {
    setSettings({ sound: true, haptics: false });
    place();
    clear();
    gameOver();
    expect(impact).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
  });

  it('ignores devices that reject haptics', async () => {
    impact.mockReturnValueOnce(Promise.reject(new Error('unavailable')));
    expect(() => place()).not.toThrow();
    // Lets the rejection settle: an unhandled one would fail the test run.
    await Promise.resolve();
  });

  it('plays only the strongest feedback for a move', () => {
    feedbackForEvents([placed]);
    expect(impact).toHaveBeenLastCalledWith('light');

    feedbackForEvents([placed, cleared]);
    expect(impact).toHaveBeenLastCalledWith('medium');
    expect(impact).toHaveBeenCalledTimes(2);

    feedbackForEvents([placed, cleared, over]);
    expect(impact).toHaveBeenCalledTimes(2);
    expect(notification).toHaveBeenCalledTimes(1);
  });

  it('plays nothing for a move with no events', () => {
    feedbackForEvents([]);
    expect(impact).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
  });
});

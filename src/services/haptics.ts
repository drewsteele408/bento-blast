// Haptic feedback for game moves. Every function checks the haptics setting first, so callers
// don't have to. Haptics are a nice-to-have: on devices without them (web, some Androids) the
// call rejects, and that is ignored.

import * as Haptics from 'expo-haptics';

import { GameEvent } from '@/engine';

import { getSettings } from './storage';

function play(feedback: () => Promise<void>): void {
  if (!getSettings().haptics) return;
  feedback().catch(() => {});
}

/** A piece landed on the board. */
export function place(): void {
  play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** One or more lines cleared. */
export function clear(): void {
  play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** No piece fits any more. */
export function gameOver(): void {
  play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/**
 * Plays one haptic for a move's events: the strongest of game over, clear and place. Several
 * in a row would blur into one buzz.
 */
export function feedbackForEvents(events: readonly GameEvent[]): void {
  const has = (type: GameEvent['type']) => events.some((e) => e.type === type);
  if (has('gameOver')) gameOver();
  else if (has('cleared')) clear();
  else if (has('placed')) place();
}

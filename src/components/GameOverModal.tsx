// Shown when no tray piece fits: final score, best score and a way to play again or go home.

import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

import { Dialog } from './Dialog';

type Props = {
  visible: boolean;
  score: number;
  best: number;
  isNewBest: boolean;
  onRestart: () => void;
  onHome: () => void;
};

export function GameOverModal({ visible, score, best, isNewBest, onRestart, onHome }: Props) {
  return (
    <Dialog
      visible={visible}
      testID="game-over"
      title="Game over"
      // Back goes home: there's nothing left to resume.
      onRequestClose={onHome}
      buttons={[
        { label: 'Restart', onPress: onRestart, primary: true },
        { label: 'Home', onPress: onHome },
      ]}
    >
      {isNewBest && (
        <Text testID="new-best" style={styles.badge}>
          New best!
        </Text>
      )}
      <Text testID="final-score" style={styles.score}>
        {score}
      </Text>
      <View style={styles.bestRow}>
        <Text style={styles.label}>Best</Text>
        <Text testID="final-best" style={styles.best}>
          {best}
        </Text>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  badge: {
    overflow: 'hidden',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.accent,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  score: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 15,
    textTransform: 'uppercase',
  },
  best: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});

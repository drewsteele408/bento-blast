// Score, best score and the current combo streak.

import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

type Props = {
  score: number;
  best: number;
  combo: number;
};

export function ScoreBar({ score, best, combo }: Props) {
  return (
    <View style={styles.bar}>
      <Stat label="Best" value={best} />
      <Text testID="score" style={styles.score}>
        {score}
      </Text>
      <Stat label="Combo" value={combo > 0 ? `×${combo}` : '–'} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  score: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  stat: {
    minWidth: 64,
    alignItems: 'center',
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});

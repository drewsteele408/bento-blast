// The pause button and the menu it opens: Resume, Restart or Home.

import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import { Dialog } from './Dialog';

type MenuProps = {
  visible: boolean;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
};

export function PauseMenu({ visible, onResume, onRestart, onHome }: MenuProps) {
  return (
    <Dialog
      visible={visible}
      testID="pause-menu"
      title="Paused"
      onRequestClose={onResume}
      buttons={[
        { label: 'Resume', onPress: onResume, primary: true },
        { label: 'Restart', onPress: onRestart },
        { label: 'Home', onPress: onHome },
      ]}
    />
  );
}

type ButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

/** Two vertical bars, drawn with Views so no icon font is needed. */
export function PauseButton({ onPress, disabled }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Pause"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dimmed]}
    >
      <View style={styles.bar} />
      <View style={styles.bar} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: colors.boardBackground,
  },
  dimmed: {
    opacity: 0.5,
  },
  bar: {
    width: 5,
    height: 16,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
});

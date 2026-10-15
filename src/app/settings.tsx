import Constants from 'expo-constants';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Dialog } from '@/components/Dialog';
import * as haptics from '@/services/haptics';
import {
  selectBest,
  selectCanResetBest,
  selectHasGameInProgress,
  useGame,
  useGameDispatch,
  useSettings,
} from '@/store';
import { colors } from '@/theme';

/** The app version from app.json. */
const APP_VERSION = Constants.expoConfig?.version ?? 'unknown';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const store = useGame();
  const best = selectBest(store);
  const canReset = selectCanResetBest(store);
  const inProgress = selectHasGameInProgress(store);
  const dispatch = useGameDispatch();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const onHapticsChange = (on: boolean) => {
    updateSettings({ haptics: on });
    // A tap to show what they feel like. Saved first, so this checks the new setting.
    if (on) haptics.place();
  };

  const resetBest = () => {
    setConfirmingReset(false);
    dispatch({ type: 'resetBest', seed: Date.now() });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <ToggleRow
          label="Sound"
          hint="Sound effects are coming in a later update."
          value={settings.sound}
          onValueChange={(on) => updateSettings({ sound: on })}
        />
        <View style={styles.divider} />
        <ToggleRow
          label="Haptics"
          hint="Vibrate when pieces land and lines clear."
          value={settings.haptics}
          onValueChange={onHapticsChange}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Best score</Text>
            <Text testID="settings-best" style={styles.hint}>
              {best}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canReset }}
            disabled={!canReset}
            onPress={() => setConfirmingReset(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.resetButton, (pressed || !canReset) && styles.dimmed]}
          >
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>
      </View>

      <Text testID="app-version" style={styles.version}>
        Version {APP_VERSION}
      </Text>

      <Dialog
        visible={confirmingReset}
        testID="confirm-reset-best"
        title="Reset best score?"
        onRequestClose={() => setConfirmingReset(false)}
        buttons={[
          { label: 'Reset', onPress: resetBest, primary: true },
          { label: 'Cancel', onPress: () => setConfirmingReset(false) },
        ]}
      >
        <Text style={styles.confirmText}>
          {inProgress
            ? 'Your best score goes back to 0. The game in progress still counts toward a new best.'
            : `Your best of ${best} goes back to 0.`}
        </Text>
      </Dialog>
    </ScrollView>
  );
}

type ToggleRowProps = {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function ToggleRow({ label, hint, value, onValueChange }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.switchOff, true: colors.accent }}
        thumbColor={colors.text}
        ios_backgroundColor={colors.switchOff}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: 16,
    padding: 16,
  },
  card: {
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.boardBackground,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.textMuted,
  },
  label: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  resetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.danger,
  },
  resetText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
  },
  dimmed: {
    opacity: 0.5,
  },
  version: {
    color: colors.inkMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  confirmText: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
});

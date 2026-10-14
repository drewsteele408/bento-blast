import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Dialog } from '@/components/Dialog';
import { selectBest, selectHasGameInProgress, useGame, useGameDispatch } from '@/store';
import { colors } from '@/theme';

export default function Home() {
  const store = useGame();
  const dispatch = useGameDispatch();
  const hasSave = selectHasGameInProgress(store);
  const best = selectBest(store);
  const [confirming, setConfirming] = useState(false);

  // Set while leaving Home, so a double tap can't push the next screen twice.
  const navigating = useRef(false);
  useFocusEffect(
    useCallback(() => {
      navigating.current = false;
    }, []),
  );

  /** Opens a screen. Returns false if Home is already on its way out. */
  const goTo = (href: Href): boolean => {
    if (navigating.current) return false;
    navigating.current = true;
    setConfirming(false);
    // Push on the next frame, once the confirm dialog has been hidden: a Modal still showing
    // while its screen changes can get stuck on iOS.
    requestAnimationFrame(() => router.push(href));
    return true;
  };

  const startNewGame = () => {
    if (goTo('/game')) dispatch({ type: 'newGame', seed: Date.now() });
  };

  const onPlay = () => {
    if (hasSave) setConfirming(true);
    else startNewGame();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bento Blast</Text>

      <View style={styles.best}>
        <Text style={styles.bestLabel}>Best</Text>
        <Text testID="home-best" style={styles.bestValue}>
          {best}
        </Text>
      </View>

      <View style={styles.buttons}>
        {hasSave && <MenuButton label="Continue" primary onPress={() => goTo('/game')} />}
        <MenuButton label={hasSave ? 'New game' : 'Play'} primary={!hasSave} onPress={onPlay} />
        <MenuButton label="Settings" onPress={() => goTo('/settings')} />
      </View>

      <Dialog
        visible={confirming}
        testID="confirm-new-game"
        title="Start a new game?"
        onRequestClose={() => setConfirming(false)}
        buttons={[
          { label: 'New game', onPress: startNewGame, primary: true },
          { label: 'Cancel', onPress: () => setConfirming(false) },
        ]}
      >
        <Text style={styles.confirmText}>Your game in progress will be lost.</Text>
      </Dialog>
    </View>
  );
}

function MenuButton({
  label,
  primary,
  onPress,
}: {
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, primary && styles.primaryText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.ink,
    fontSize: 40,
    fontWeight: '800',
  },
  best: {
    alignItems: 'center',
  },
  bestLabel: {
    color: colors.inkMuted,
    fontSize: 15,
    textTransform: 'uppercase',
  },
  bestValue: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  buttons: {
    width: '100%',
    maxWidth: 280,
    gap: 12,
  },
  button: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    borderWidth: 2,
    borderColor: colors.inkMuted,
  },
  pressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  primaryText: {
    color: colors.ink,
  },
  confirmText: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
});

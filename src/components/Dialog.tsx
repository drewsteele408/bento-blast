// A centered card over a dimmed screen, with a title, optional content and a column of buttons.
// Used for game over, pause and confirmations. Built on Modal rather than Alert so it looks the
// same on every platform and works on web.

import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

export type DialogButton = {
  label: string;
  onPress: () => void;
  /** The main action is filled with the accent color. Defaults to false (outlined). */
  primary?: boolean;
};

type Props = {
  visible: boolean;
  title: string;
  buttons: DialogButton[];
  /** Android back button / Escape on web. */
  onRequestClose: () => void;
  children?: ReactNode;
  testID?: string;
};

export function Dialog({ visible, title, buttons, onRequestClose, children, testID }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onRequestClose}
    >
      <View style={styles.backdrop}>
        <View testID={testID} style={styles.card} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {children}
          <View style={styles.buttons}>
            {buttons.map(({ label, onPress, primary }) => (
              <Pressable
                key={label}
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
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 16,
    padding: 24,
    borderRadius: 20,
    backgroundColor: colors.boardBackground,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  buttons: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 8,
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
    borderColor: colors.textMuted,
  },
  pressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  primaryText: {
    color: colors.ink,
  },
});

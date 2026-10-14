import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

// Temporary Home screen until Phase 4.4: just a way into the game.
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bento Blast</Text>
      <Link href="/game" asChild>
        <Pressable accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>Play</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 14,
    backgroundColor: colors.accent,
  },
  buttonText: {
    color: colors.background,
    fontSize: 20,
    fontWeight: '800',
  },
});

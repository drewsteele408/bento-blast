import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

// Placeholder so Home's Settings button has somewhere to go. Phase 5.1 adds the sound and
// haptics toggles, reset best score and the app version.
export default function Settings() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Sound, haptics and more are coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  text: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
});
